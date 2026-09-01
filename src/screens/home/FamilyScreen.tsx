/**
 * FamilyScreen — Family tab container
 *
 * On mount, fetches the seeker's linked wali from the backend:
 *   - null  → NoWaliCard (invite flow)
 *   - found → WaliUnresponsiveScreen (wali card with stats)
 *
 * External overrides (passed from App.tsx as `waliState`):
 *   'resigned'  → WaliResignedScreen
 *   'isWaliFor' → IsWaliForScreen
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Clipboard,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { ApiError } from '../../api/client';
import {
  createWaliInvite,
  getFamilyStatus,
  removeWali,
  type WaliInvite,
  type WaliMember,
} from '../../api/wali';

import { WaliResignedScreen }     from './WaliResignedScreen';
import { WaliUnresponsiveScreen } from './WaliUnresponsiveScreen';
import { IsWaliForScreen }        from './IsWaliForScreen';
import { Bone } from '../../components/ui/Skeleton';

// ─── design tokens ────────────────────────────────────────────────────────────
const C = {
  rose:      '#E6396E',
  indSoft:   '#EEECF8',
  indInk:    '#332C66',
  mintSoft:  '#E5F6F0',
  mintInk:   '#0A5C43',
  goldSoft:  '#FBF2DE',
  goldInk:   '#B5820D',
  greySoft:  '#F2F1F7',
  greyInk:   '#6E6B80',
  page:      '#F6F5FA',
  line:      '#EEEDF3',
  ink:       '#17171F',
  ink2:      '#5F5E70',
  ink3:      '#9695A5',
} as const;

// ─── type ─────────────────────────────────────────────────────────────────────
// Only the states that cannot be derived from the API (resigned, isWaliFor)
// need to be passed in from outside; the rest are determined by the API response.
export type WaliState = 'active' | 'resigned' | 'unresponsive' | 'isWaliFor' | 'none';

export interface FamilyScreenProps {
  waliState?: WaliState;
  onBack?: () => void;
  onAskWaliAgain?: () => void;
  onChooseAnotherWali?: () => void;
  onReviewProposal?: () => void;
  onSwitchToProfile?: () => void;
}

// ─── icons ────────────────────────────────────────────────────────────────────
function ChevLeft() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={C.indInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function UserIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 21v-1a7 7 0 0 1 16 0v1" />
    </Svg>
  );
}

function WhatsAppIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#fff"/>
      <Path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.985-1.31A9.945 9.945 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

function CodeIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"
      stroke={C.indInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={3} width={7} height={7} rx={1} />
      <Rect x={14} y={3} width={7} height={7} rx={1} />
      <Rect x={3} y={14} width={7} height={7} rx={1} />
      <Path d="M14 14h2v2h-2zM18 14h3M14 18h3M20 18v3M17 21h3" />
    </Svg>
  );
}

function CopyIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none"
      stroke={C.indInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={9} y={9} width={13} height={13} rx={2} />
      <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Svg>
  );
}

// ─── data row ─────────────────────────────────────────────────────────────────
function DataRow({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <View style={[styles.dataRow, first && styles.dataRowFirst]}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
    </View>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatJoinDate(isoDate: string): string {
  const d = new Date(isoDate);
  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];
  return `joined ${d.getDate()} ${months[d.getMonth()]}`;
}

// ─── No-wali invite card ──────────────────────────────────────────────────────
interface NoWaliCardProps {
  onBack?: () => void;
  onWaliLinked?: () => void;
}

function NoWaliCard({ onBack, onWaliLinked }: NoWaliCardProps) {
  const insets = useSafeAreaInsets();
  // Which button is waiting, not merely that one is: both actions share the
  // same request, so a single boolean put "Creating invite…" on the WhatsApp
  // button when the code button was the one pressed.
  const [pending, setPending]           = useState<'whatsapp' | 'code' | null>(null);
  const [invite, setInvite]             = useState<WaliInvite | null>(null);
  const [copied, setCopied]             = useState(false);
  const [error, setError]               = useState<string | null>(null);

  async function generateInvite(source: 'whatsapp' | 'code'): Promise<WaliInvite | null> {
    if (pending) return null;
    setPending(source);
    setError(null);
    try {
      const result = await createWaliInvite();
      setInvite(result);
      return result;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Could not connect to server. Please check your connection.');
      }
      return null;
    } finally {
      setPending(null);
    }
  }

  async function handleWhatsApp() {
    const inv = invite ?? await generateInvite('whatsapp');
    if (inv?.inviteLink) Linking.openURL(inv.inviteLink).catch(() => {});
  }

  async function handleCode() {
    if (invite) return;
    await generateInvite('code');
  }

  function handleCopy() {
    if (!invite) return;
    Clipboard.setString(invite.invitationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
          <ChevLeft />
        </Pressable>
        <Text style={styles.topBarTitle}>Your Wali</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 32, 40) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          {/* Empty-state header */}
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: C.indSoft }]}>
              <UserIcon color={C.indInk} />
            </View>
            <Text style={styles.emptyTitle}>Add your wali</Text>
            <Text style={styles.emptyBody}>
              Your wali reviews proposals on your behalf. Invite a mahram male relative to get started.
            </Text>
          </View>

          {/* Invite form */}
          <View style={styles.inviteForm}>
            {/* Error */}
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            {/* Generated invite code box */}
            {invite && (
              <View style={styles.codeBox}>
                <Text style={styles.codeBoxTitle}>Invitation code</Text>
                <Text style={styles.codeValue}>{invite.invitationCode}</Text>
                <Text style={styles.codeHint}>
                  Ask your wali to open the Kindred app and enter this code.
                </Text>
                <Pressable
                  onPress={handleCopy}
                  style={({ pressed }) => [styles.copyBtn, pressed && { opacity: 0.7 }]}>
                  <CopyIcon />
                  <Text style={styles.copyBtnTxt}>{copied ? 'Copied!' : 'Copy code'}</Text>
                </Pressable>
              </View>
            )}

            {/* Action buttons */}
            <Pressable
              onPress={handleWhatsApp}
              disabled={pending !== null}
              style={({ pressed }) => [
                styles.btn,
                styles.btnWhatsapp,
                { opacity: pressed || pending !== null ? 0.8 : 1, marginTop: 18 },
              ]}>
              <WhatsAppIcon />
              <Text style={[styles.btnText, { color: '#fff', marginLeft: 8 }]}>
                {pending === 'whatsapp' ? 'Creating invite…' : 'Invite on WhatsApp'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleCode}
              disabled={pending !== null || !!invite}
              style={({ pressed }) => [
                styles.btn,
                styles.btnOutline,
                { opacity: pressed || pending !== null ? 0.8 : 1, marginTop: 9 },
              ]}>
              <CodeIcon />
              <Text style={[styles.btnText, { color: C.indInk, marginLeft: 8 }]}>
                {invite
                  ? 'Code shown above'
                  : pending === 'code'
                    ? 'Creating invite…'
                    : 'Share invite code'}
              </Text>
            </Pressable>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── module-level cache (survives component unmount/remount) ──────────────────
// Fetched once; cleared when wali is removed or changed.
let _cachedMember: WaliMember | null | undefined = undefined; // undefined = not yet fetched
export function clearFamilyScreenCache() {
  _cachedMember = undefined;
}

// ─── FamilyScreen ─────────────────────────────────────────────────────────────
export function FamilyScreen({
  waliState,
  onBack,
  onAskWaliAgain,
  onChooseAnotherWali,
  onReviewProposal,
  onSwitchToProfile,
}: FamilyScreenProps) {
  const insets = useSafeAreaInsets();
  // Seed state from cache so remounts don't show a loading flash
  const [loading, setLoading]     = useState(_cachedMember === undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [member, setMember]       = useState<WaliMember | null>(_cachedMember ?? null);

  // Fetch on mount (and after change-wali)
  const loadWali = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const linked = await getFamilyStatus();
      _cachedMember = linked;
      setMember(linked);
    } catch (err) {
      setMember(null);
      if (err instanceof ApiError) {
        setLoadError(err.message);
      } else {
        setLoadError('Could not connect to server. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Skip API fetch for states that are determined externally (resigned, isWaliFor)
    if (waliState === 'resigned' || waliState === 'isWaliFor') {
      setLoading(false);
      return;
    }
    // Skip if we already have cached data from a previous mount
    if (_cachedMember !== undefined) return;
    loadWali();
  }, [waliState, loadWali]);

  // Change wali: remove current wali then show invite screen
  async function handleChangeWali() {
    if (!member) return;
    try {
      await removeWali(member.membershipId);
    } catch {
      // Proceed optimistically — the membership may already be gone
    }
    _cachedMember = null;
    setMember(null);
  }

  // ── external overrides ──────────────────────────────────────────────────────
  if (waliState === 'resigned') {
    return (
      <WaliResignedScreen
        onBack={onBack}
        onAskAgain={onAskWaliAgain}
        onChooseAnother={onChooseAnotherWali}
      />
    );
  }

  if (waliState === 'isWaliFor') {
    return (
      <IsWaliForScreen
        onBack={onBack}
        onReviewProposal={onReviewProposal}
        onSwitchToProfile={onSwitchToProfile}
      />
    );
  }

  // ── loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    /**
     * A card-shaped stand-in rather than a centred spinner.
     *
     * This screen resolves to one of several states — no wali, an invite
     * pending, a linked guardian — and all of them are a card with an icon,
     * a heading and a couple of lines. That common shape is what the skeleton
     * shows, so the page does not jump when the state is known.
     */
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.scroll, { paddingTop: 8 }]}>
          <View style={styles.card}>
            <View style={styles.emptyWrap}>
              <Bone w={52} h={52} radius={18} />
              <Bone w={132} h={17} radius={7} style={{ marginTop: 14 }} />
              <Bone w={'86%'} h={13} radius={6} style={{ marginTop: 10 }} />
              <Bone w={'70%'} h={13} radius={6} style={{ marginTop: 6 }} />
              <Bone w={'100%'} h={48} radius={15} style={{ marginTop: 18 }} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ── load error → error screen ───────────────────────────────────────────────
  if (loadError) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.errorMsg}>{loadError}</Text>
        <Pressable
          onPress={loadWali}
          style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}>
          <Text style={styles.retryTxt}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  // ── no wali → invite screen ─────────────────────────────────────────────────
  if (!member) {
    return <NoWaliCard onBack={onBack} onWaliLinked={loadWali} />;
  }

  // ── wali linked → wali card ─────────────────────────────────────────────────
  const name = member.wali.fullName;
  return (
    <WaliUnresponsiveScreen
      waliName={name}
      waliInitials={getInitials(name)}
      waliRelationship={member.relationship}
      joinedLabel={formatJoinDate(member.joinedAt)}
      proposalsAwaitingReview={member.proposalsAwaitingReview}
      onBack={onBack}
      onChangeWali={handleChangeWali}
    />
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.page,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // TopBar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(40,30,80,0.07)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    flexShrink: 0,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: C.ink,
  },

  // Scroll
  scroll: {
    paddingHorizontal: 15,
    paddingTop: 4,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    shadowColor: 'rgba(40,30,80,1)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 13,
    overflow: 'hidden',
  },

  // Data rows
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.line,
    gap: 10,
  },
  dataRowFirst: {
    borderTopWidth: 0,
  },
  dataLabel: {
    fontSize: 13.5,
    color: C.ink3,
  },
  dataValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: C.ink,
    textAlign: 'right',
  },

  // Empty / no-wali state
  emptyWrap: {
    alignItems: 'center',
    padding: 28,
    paddingBottom: 8,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13.5,
    color: C.ink2,
    lineHeight: 20,
    textAlign: 'center',
  },

  // Invite form
  inviteForm: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  errorText: {
    fontSize: 11.5,
    color: '#D9304F',
    marginTop: 8,
  },

  // Invite code box
  codeBox: {
    marginTop: 18,
    backgroundColor: C.indSoft,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  codeBoxTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: C.indInk,
    marginBottom: 8,
  },
  codeValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
    color: C.indInk,
    marginBottom: 8,
  },
  codeHint: {
    fontSize: 12.5,
    color: C.indInk,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  copyBtnTxt: {
    fontSize: 12.5,
    fontWeight: '700',
    color: C.indInk,
  },

  // Error state
  errorMsg: {
    fontSize: 14,
    color: C.ink2,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 16,
    lineHeight: 20,
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 13,
    backgroundColor: C.indSoft,
  },
  retryTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: C.indInk,
  },

  // Action buttons
  btn: {
    flexDirection: 'row',
    minHeight: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  btnWhatsapp: {
    backgroundColor: '#25D366',
  },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: C.indSoft,
    backgroundColor: '#fff',
  },
  btnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
