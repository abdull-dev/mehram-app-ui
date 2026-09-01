/**
 * PhotosScreen  (F14)
 *
 * Photo upload — one required, two optional.
 * Tapping a slot opens the device gallery; the selected image is uploaded
 * immediately and shown as a preview in the slot.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { launchImageLibrary } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { OnboardingExit } from '../../components/ui/OnboardingExit';
import { Colors, GradientColors } from '../../theme/colors';
import {
  uploadPhoto,
  deletePhoto,
  getMyProfile,
  updatePhotoPrivacy,
  PHOTO_PRIVACY_OPTIONS,
  DEFAULT_PHOTO_PRIVACY,
  type PhotoVisibilityMode,
} from '../../api/profile';
import { resolvePhotoUrl } from '../../api/config';

// ─── animation ────────────────────────────────────────────────────────────────
const RISE_DURATION = 550;
const RISE_EASING = Easing.bezier(0.2, 0.7, 0.3, 1);

function useFadeRise(delay: number) {
  const anim = useRef(new Animated.Value(0)).current;
  return { anim, delay };
}

function riseStyle(anim: Animated.Value) {
  return {
    opacity: anim,
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) },
    ],
  };
}

// ─── icon helpers ─────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"
      stroke={Colors.vioInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function CameraIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <Circle cx="12" cy="13" r="3.4" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6L9 17l-5-5" />
    </Svg>
  );
}

function TrashIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </Svg>
  );
}

// ─── slot state ───────────────────────────────────────────────────────────────
interface SlotState {
  uri: string | null;       // local URI (new pick) or signed URL (loaded from DB)
  photoId: string | null;   // backend photo ID — set for photos loaded from DB
  uploading: boolean;
  error: boolean;
}

const EMPTY_SLOT: SlotState = { uri: null, photoId: null, uploading: false, error: false };

// ─── component ────────────────────────────────────────────────────────────────
interface PhotosScreenProps {
  onBack?: () => void;
  /**
   * Leave the flow and return to Home, shown as an ✕.
   *
   * Set only when this screen was entered from Home to finish a profile
   * section, where it is the first step of its own trip.
   */
  onClose?: () => void;
  /** Abandon the signup, shown as "Log out". */
  onLogout?: () => void;
  onContinue?: () => void;
  continueLoading?: boolean;
}

export function PhotosScreen({ onBack, onClose, onLogout, onContinue, continueLoading }: PhotosScreenProps) {
  const insets = useSafeAreaInsets();

  const [slots, setSlots] = useState<[SlotState, SlotState, SlotState]>([
    { ...EMPTY_SLOT },
    { ...EMPTY_SLOT },
    { ...EMPTY_SLOT },
  ]);
  /**
   * Null until the user picks one.
   *
   * It used to default to NOBODY, so a chip was always highlighted and the
   * screen looked answered before anyone had chosen — and Continue would save
   * that default as if it were a decision. Who can see your photos is not a
   * question to answer on the user's behalf.
   */
  /**
   * Always one of the offered options — never unset.
   *
   * It started as `null`, so the step opened with nothing selected and Continue
   * disabled until the user picked. Two different states produced that: a fresh
   * profile with nothing stored, and a man's profile, where the server's default
   * is OPEN — a mode this list does not offer, so no chip matched it and none
   * appeared selected even though a value existed.
   */
  const [privacyMode, setPrivacyMode] = useState<PhotoVisibilityMode>(
    DEFAULT_PHOTO_PRIVACY,
  );
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const hasPhoto = slots[0].uri !== null && !slots[0].uploading;
  // Both are required: a photo to show, and an explicit choice about who sees it.
  // A visibility is always set now, so the photo is the only thing to wait for.
  const hasRequired = hasPhoto;

  function setSlot(index: 0 | 1 | 2, patch: Partial<SlotState>) {
    setSlots(prev => {
      const next: [SlotState, SlotState, SlotState] = [
        { ...prev[0] },
        { ...prev[1] },
        { ...prev[2] },
      ];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  // ── load existing photos + privacy setting from API on mount ─────────────────
  useEffect(() => {
    const VIS_TO_INDEX: Record<string, number> = {
      APPROVAL_REQUIRED: 0,
      WALI_ONLY: 1,
      MUTUAL_ONLY: 2,
      PUBLIC: 3,
    };
    getMyProfile().then(profile => {
      // Only adopt a stored value this screen can actually show. OPEN is a real
      // mode but not one of the choices here, and selecting nothing to represent
      // it is worse than falling back to the strictest — which is also what
      // Continue would then save.
      const saved = profile.privacySettings?.photoVisibilityMode;
      if (saved && PHOTO_PRIVACY_OPTIONS.some(o => o.mode === saved)) {
        setPrivacyMode(saved);
      }
      if (!profile.photos?.length) return;
      setSlots(prev => {
        const next: [SlotState, SlotState, SlotState] = [
          { ...prev[0] },
          { ...prev[1] },
          { ...prev[2] },
        ];
        // Photos are ordered by position asc from the backend.
        // Position 0 → slot 0 (required), 1 → slot 1, 2 → slot 2.
        profile.photos.slice(0, 3).forEach((photo, i) => {
          if (photo.url) {
            next[i as 0 | 1 | 2] = {
              uri: resolvePhotoUrl(photo.url) ?? photo.url,
              photoId: photo.id,
              uploading: false,
              error: false,
            };
          }
        });
        return next;
      });
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pickAndUpload(index: 0 | 1 | 2) {
    // Already uploading — don't allow a second picker to open.
    if (slots[index].uploading) return;

    const result = await launchImageLibrary({
      mediaType: 'photo',
      // Typed as a PhotoQuality literal union, so a bare number is rejected.
      quality: 0.8 as const,
      selectionLimit: 1,
    });

    if (result.didCancel || !result.assets?.length) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const fileName = asset.fileName ?? `photo_${Date.now()}.jpg`;
    const mimeType = asset.type ?? 'image/jpeg';

    if (!uri) return;

    // Show preview immediately while the upload happens in the background.
    setSlot(index, { uri, uploading: true, error: false });

    try {
      const saved = await uploadPhoto(uri, fileName, mimeType);
      setSlot(index, { uploading: false, error: false, photoId: saved.id });
    } catch {
      setSlot(index, { uploading: false, error: true });
    }
  }

  function removeSlot(index: 0 | 1 | 2) {
    const photoId = slots[index].photoId;
    setSlot(index, { ...EMPTY_SLOT });
    if (photoId) {
      deletePhoto(photoId).catch(() => {});
    }
  }

  // Staggered entrance animations
  const header = useFadeRise(70);
  const slotsAnim = useFadeRise(150);
  const chips = useFadeRise(230);

  useEffect(() => {
    const makeRise = ({ anim, delay }: ReturnType<typeof useFadeRise>) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: RISE_DURATION,
        delay,
        easing: RISE_EASING,
        useNativeDriver: true,
      });
    Animated.parallel([makeRise(header), makeRise(slotsAnim), makeRise(chips)]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <AmbientBackground />

      <View style={[styles.screen, {
        paddingTop: Math.max(insets.top, 16),
        paddingBottom: Math.max(insets.bottom, 24),
      }]}>

        {/* ── Navigation bar ──────────────────────────────────────── */}
        <View style={styles.navbar}>
          {/* Omitted when there is nothing behind this screen: entering the
              flow straight from Home makes this its first step. */}
          {!!onBack && (
            <Pressable onPress={onBack}
              style={({ pressed }) => [styles.backBtn, {
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.92 : 1 }],
              }]}>
              <BackIcon />
            </Pressable>
          )}
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[...GradientColors.primary]}
              locations={[...GradientColors.primaryLocations]}
              start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
              style={styles.progressFill}
            />
          </View>
          {/* Entered from Home, so there is nowhere to go back to — but there
              does have to be a way out. */}
          <OnboardingExit onClose={onClose} onLogout={onLogout} />
        </View>

        {/* ── Scrollable body ──────────────────────────────────────── */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Header */}
          <Animated.View style={[styles.questionBlock, riseStyle(header.anim)]}
            needsOffscreenAlphaCompositing>
            <View style={styles.sectionPill}>
              <Text style={styles.sectionPillText}>YOUR PHOTOS</Text>
            </View>
            <Text style={styles.heading}>Add one photo</Text>
            <Text style={styles.subtitle}>
              One is enough. Two more are optional and most people add them later.
            </Text>
          </Animated.View>

          {/* ── Photo slots ─────────────────────────────────────── */}
          <Animated.View style={[styles.slotsRow, riseStyle(slotsAnim.anim)]}
            needsOffscreenAlphaCompositing>
            <PhotoSlot
              required
              slot={slots[0]}
              onPress={() => pickAndUpload(0)}
              onRemove={() => removeSlot(0)}
            />
            <PhotoSlot
              slot={slots[1]}
              onPress={() => pickAndUpload(1)}
              onRemove={() => removeSlot(1)}
            />
            <PhotoSlot
              slot={slots[2]}
              onPress={() => pickAndUpload(2)}
              onRemove={() => removeSlot(2)}
            />
          </Animated.View>

          {/* ── Privacy chips ────────────────────────────────────── */}
          <Animated.View style={[styles.fieldBlock, riseStyle(chips.anim)]}
            needsOffscreenAlphaCompositing>
            <Text style={styles.fieldLabel}>WHO CAN SEE THEM</Text>
            <View style={styles.chipsWrap}>
              {PHOTO_PRIVACY_OPTIONS.map(option => (
                <PrivacyChip
                  key={option.mode}
                  label={option.chipLabel}
                  selected={privacyMode === option.mode}
                  onPress={() => setPrivacyMode(option.mode)}
                />
              ))}
            </View>
            <Text style={styles.fieldHint}>Screenshots are blocked in every option.</Text>
          </Animated.View>
        </ScrollView>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <GradientButton
            label="Continue"
            variant={hasRequired ? 'primary' : 'disabled'}
            loading={continueLoading || savingPrivacy}
            onPress={
              hasRequired
                ? async () => {
                    setSavingPrivacy(true);
                    try {
                      await updatePhotoPrivacy({
                        photoVisibilityMode: privacyMode,
                      });
                      onContinue?.();
                    } catch (err) {
                      const msg =
                        err instanceof Error
                          ? err.message
                          : 'Could not save photo privacy. Please try again.';
                      Alert.alert('Could not save', msg);
                    } finally {
                      setSavingPrivacy(false);
                    }
                  }
                : undefined
            }
          />
        </View>
      </View>
    </View>
  );
}

// ─── PhotoSlot ────────────────────────────────────────────────────────────────
interface PhotoSlotProps {
  required?: boolean;
  slot: SlotState;
  onPress: () => void;
  onRemove: () => void;
}

function PhotoSlot({ required = false, slot, onPress, onRemove }: PhotoSlotProps) {
  const { uri, uploading, error } = slot;
  const hasPhoto = uri !== null;

  const inner = (
    <>
      {hasPhoto ? (
        <>
          {/* Photo preview */}
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />

          {/* Uploading overlay */}
          {uploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color="#fff" size="small" />
            </View>
          )}

          {/* Error badge */}
          {error && !uploading && (
            <View style={styles.errorBadge}>
              <Text style={styles.errorBadgeText}>!</Text>
            </View>
          )}

          {/* Remove button — top-right */}
          {!uploading && (
            <Pressable
              onPress={e => { e.stopPropagation(); onRemove(); }}
              style={styles.removeBtn}
              hitSlop={8}>
              <TrashIcon />
            </Pressable>
          )}
        </>
      ) : (
        <>
          <CameraIcon color={required ? Colors.vioD : '#B7ADD9'} />
          <Text style={[styles.slotLabel, required && styles.slotLabelReq]}>
            {required ? 'Required' : 'Optional'}
          </Text>
        </>
      )}
    </>
  );

  if (required) {
    return (
      <Pressable
        onPress={hasPhoto && !uploading ? undefined : onPress}
        style={({ pressed }) => [styles.slot, {
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        }]}>
        <LinearGradient
          colors={['#FEF0F6', '#F2ECFE']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.slotInner, styles.slotReq, hasPhoto && styles.slotHasPhoto]}>
          {inner}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={hasPhoto && !uploading ? undefined : onPress}
      style={({ pressed }) => [styles.slot, {
        opacity: pressed ? 0.88 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      }]}>
      <View style={[styles.slotInner, styles.slotOpt, hasPhoto && styles.slotOptFilled]}>
        {inner}
      </View>
    </Pressable>
  );
}

// ─── PrivacyChip ──────────────────────────────────────────────────────────────
interface PrivacyChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function PrivacyChip({ label, selected, onPress }: PrivacyChipProps) {
  if (selected) {
    return (
      <Pressable onPress={onPress}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}>
        <LinearGradient
          colors={[...GradientColors.primary]}
          locations={[...GradientColors.primaryLocations]}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={[styles.chip, styles.chipSelected]}>
          <Text style={styles.chipLabelSelected}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress}
      style={({ pressed }) => [styles.chip, styles.chipDefault, {
        transform: [{ scale: pressed ? 0.96 : 1 }],
      }]}>
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.page, overflow: 'hidden' },
  screen: { flex: 1, paddingHorizontal: 16, flexDirection: 'column' },

  navbar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 12, paddingBottom: 4, flexShrink: 0,
  },
  // Holds the back button's place in the row when there is nothing behind this
  // screen. Dimensions only: reusing `backBtn` left its chip and shadow behind
  // as an empty white square where the button used to be.
  backBtn: {
    width: 38, height: 38, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    shadowColor: '#3C287A', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  progressTrack: {
    flex: 1, height: 7, borderRadius: 5,
    backgroundColor: 'rgba(155,123,240,0.16)', overflow: 'hidden',
  },
  progressFill: { width: '86%', height: '100%', borderRadius: 5 },

  scrollArea: { flex: 1 },
  scrollContent: { paddingTop: 2, paddingBottom: 16 },

  questionBlock: { paddingTop: 18, paddingBottom: 2 },
  sectionPill: {
    alignSelf: 'flex-start', backgroundColor: Colors.vioSoft,
    borderRadius: 9, paddingHorizontal: 11, paddingVertical: 5, marginBottom: 10,
  },
  sectionPillText: {
    fontSize: 10.5, fontWeight: '800', letterSpacing: 1,
    textTransform: 'uppercase', color: Colors.vioInk,
  },
  heading: { fontSize: 24, fontWeight: '800', letterSpacing: -0.7, lineHeight: 29, color: Colors.ink },
  subtitle: { fontSize: 13, color: Colors.ink2, marginTop: 8, lineHeight: 20 },

  slotsRow: { flexDirection: 'row', gap: 9, marginTop: 12 },

  slot: { flex: 1, aspectRatio: 3 / 4 },

  slotInner: {
    flex: 1, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    gap: 6, overflow: 'hidden',
  },
  slotReq: {
    shadowColor: 'rgba(180,110,200,1)',
    shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16,
    shadowRadius: 8, elevation: 4,
  },
  slotHasPhoto: {
    // once a photo is set, remove the gap so the image fills cleanly
    gap: 0,
  },
  slotOpt: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1.6, borderStyle: 'dashed',
    borderColor: 'rgba(155,123,240,0.34)',
  },
  slotOptFilled: {
    backgroundColor: 'rgba(240,235,254,0.9)',
    borderColor: Colors.vio, borderStyle: 'solid',
  },

  slotLabel: { fontSize: 10.5, fontWeight: '800', color: Colors.ink3 },
  slotLabelReq: { color: Colors.vioInk },

  // Upload / error overlays
  uploadOverlay: {
    // `StyleSheet.absoluteFillObject` no longer exists in this RN version.
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  errorBadge: {
    position: 'absolute', top: 8, left: 8,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#D9304F',
    alignItems: 'center', justifyContent: 'center',
  },
  errorBadgeText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  // Remove button
  removeBtn: {
    position: 'absolute', top: 7, right: 7,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },

  fieldBlock: { marginTop: 20 },
  fieldLabel: {
    fontSize: 11, fontWeight: '800', letterSpacing: 0.8,
    textTransform: 'uppercase', color: Colors.ink3, marginBottom: 8,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 15 },
  chipDefault: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1.6, borderColor: 'rgba(155,123,240,0.2)',
    shadowColor: '#3C287A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 4.5, elevation: 1,
  },
  chipSelected: {
    shadowColor: '#B464C8', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 8, elevation: 4,
  },
  chipLabel: { fontSize: 13.5, fontWeight: '700', color: Colors.ink2 },
  chipLabelSelected: { fontSize: 13.5, fontWeight: '700', color: '#fff' },
  fieldHint: { fontSize: 11.5, color: Colors.ink3, marginTop: 7, lineHeight: 17 },

  footer: { paddingTop: 12 },
});
