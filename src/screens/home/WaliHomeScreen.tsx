/**
 * WaliHomeScreen
 *
 * Home screen shown to wali users after sign-in.
 * Shows greeting, pending proposals to review, and bottom tabs.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

// ─── skeleton ─────────────────────────────────────────────────────────────────

function usePulse() {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ]),
    ).start();
  }, [anim]);
  return anim;
}

function SkeletonBox({ w, h, r = 10, style }: { w?: number | string; h: number; r?: number; style?: object }) {
  const opacity = usePulse();
  return (
    <Animated.View
      style={[{ width: w ?? '100%', height: h, borderRadius: r, backgroundColor: '#E4E2ED', opacity }, style]}
    />
  );
}

function ReviewTabSkeleton() {
  return (
    <>
      {/* Status card */}
      <SkeletonBox h={72} r={20} style={{ marginBottom: 14 }} />
      {/* Section label */}
      <SkeletonBox w={160} h={14} r={7} style={{ marginTop: 8, marginBottom: 12 }} />
      {/* Intro card */}
      <View style={skStyles.card}>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBox w={160} h={18} r={8} />
            <SkeletonBox w={110} h={13} r={6} />
            <SkeletonBox w={90} h={12} r={6} />
          </View>
          <View style={{ gap: 6, alignItems: 'flex-end' }}>
            <SkeletonBox w={80} h={22} r={8} />
          </View>
        </View>
        <SkeletonBox h={1} r={0} style={{ marginBottom: 8 }} />
        {[0,1,2,3,4,5].map(i => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#EEEDF3' }}>
            <SkeletonBox w={80} h={13} r={6} />
            <SkeletonBox w={60} h={13} r={6} />
          </View>
        ))}
        <SkeletonBox h={44} r={13} style={{ marginTop: 14 }} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <SkeletonBox h={44} r={13} style={{ flex: 1 }} />
          <SkeletonBox h={44} r={13} style={{ flex: 1.4 }} />
        </View>
      </View>
    </>
  );
}

function ProposalsTabSkeleton() {
  return (
    <>
      <SkeletonBox w={140} h={28} r={10} style={{ marginTop: 8, marginBottom: 14 }} />
      <SkeletonBox h={46} r={14} style={{ marginBottom: 14 }} />
      {[0, 1, 2].map(i => (
        <View key={i} style={[skStyles.card, { marginBottom: 13, gap: 12 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1, gap: 7 }}>
              <SkeletonBox w={160} h={17} r={8} />
              <SkeletonBox w={100} h={12} r={6} />
              <SkeletonBox w={80} h={11} r={5} />
            </View>
            <SkeletonBox w={80} h={26} r={8} />
          </View>
          <SkeletonBox h={5} r={4} />
        </View>
      ))}
    </>
  );
}

function ConversationsTabSkeleton() {
  return (
    <View style={skStyles.card}>
      {[0, 1, 2].map(i => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: '#EEEDF3' }}>
          <SkeletonBox w={40} h={40} r={13} />
          <View style={{ flex: 1, gap: 7 }}>
            <SkeletonBox w={130} h={14} r={6} />
            <SkeletonBox w={200} h={12} r={5} />
          </View>
        </View>
      ))}
    </View>
  );
}

function FamilyTabSkeleton() {
  return (
    <>
      {/* Linked accounts card */}
      <View style={[skStyles.card, { marginTop: 8, marginBottom: 4 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <SkeletonBox w={140} h={16} r={7} />
          <SkeletonBox w={80} h={22} r={10} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <View style={{ alignItems: 'center', gap: 6, width: 68 }}>
            <SkeletonBox w={56} h={56} r={28} />
            <SkeletonBox w={30} h={12} r={5} />
            <SkeletonBox w={50} h={11} r={5} />
          </View>
          <SkeletonBox w={1} h={60} r={0} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F6F5FA', borderRadius: 14, padding: 12 }}>
              <SkeletonBox w={40} h={40} r={20} />
              <View style={{ flex: 1, gap: 7 }}>
                <SkeletonBox w={80} h={14} r={6} />
                <SkeletonBox w={60} h={11} r={5} />
              </View>
            </View>
          </View>
        </View>
        <SkeletonBox h={48} r={14} />
      </View>
      {/* Section label */}
      <SkeletonBox w={120} h={12} r={5} style={{ marginTop: 16, marginBottom: 8 }} />
      {/* Profile card */}
      <View style={skStyles.card}>
        <View style={{ gap: 10, marginBottom: 14 }}>
          <SkeletonBox h={130} r={14} style={{ marginHorizontal: -18, marginTop: -18, borderRadius: 14 }} />
        </View>
        {[0, 1, 2, 3, 4].map(i => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#EEEDF3' }}>
            <SkeletonBox w={70} h={13} r={6} />
            <SkeletonBox w={80} h={13} r={6} />
          </View>
        ))}
        <SkeletonBox h={48} r={14} style={{ marginTop: 16 }} />
      </View>
    </>
  );
}

const skStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: 'rgba(40,30,80,1)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 14,
  },
});
import { ProposalDetailScreen, type ProposalDetailSelection } from './ProposalDetailScreen';
import type { Introduction } from '../../api/introductions';
import type { WardProposal, WardReceivedProposal } from '../../api/wali';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { formatHeight } from '../../utils/height';
import { buildProposalSteps } from '../../lib/proposalSteps';

// ─── design tokens ────────────────────────────────────────────────────────────
const C = {
  page:     '#F6F5FA',
  ink:      '#17171F',
  ink2:     '#5F5E70',
  ink3:     '#9695A5',
  rose:     '#E6396E',
  roseSoft: '#FDECF2',
  indSoft:  '#EEECF8',
  indInk:   '#332C66',
  goldBg:   '#B5820D',
  goldSoft: '#FBF2DE',
  goldInk:  '#B5820D',
  mintSoft: '#E5F6F0',
  mintInk:  '#0A5C43',
  line:     '#EEEDF3',
  white:    '#FFFFFF',
} as const;

// ─── icons ────────────────────────────────────────────────────────────────────
function HomeIcon({ active }: { active?: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
      stroke={active ? C.rose : C.ink3} strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5z" />
      <Path d="M9 21V12h6v9" />
    </Svg>
  );
}

function ChatIcon({ active }: { active?: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
      stroke={active ? C.rose : C.ink3} strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
    </Svg>
  );
}

function FamilyIcon({ active }: { active?: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
      stroke={active ? C.rose : C.ink3} strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx={9} cy={7} r={3.5} />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

function ProposalsIcon({ active }: { active?: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
      stroke={active ? C.rose : C.ink3} strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Path d="M3 7l9 6 9-6" />
    </Svg>
  );
}

function SettingsIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke={C.ink3} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={3} />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}

function CheckBadge() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none"
      stroke={C.mintInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l5 5 9-10" />
    </Svg>
  );
}

function ShieldIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none"
      stroke={C.indInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Svg>
  );
}

// ─── types ────────────────────────────────────────────────────────────────────
export interface WaliProposal {
  age?: number;
  city?: string;
  sect?: string;
  religiosity?: string;
  education?: string;
  profession?: string;
  familyType?: string;
  familyCity?: string;
  suitorWaliName?: string;
  suitorWaliRelation?: string;
  idVerified?: boolean;
  hasWali?: boolean;
}

export interface WaliReviewedProposal {
  id: string;
  suitorAge?: number;
  suitorCity?: string;
  suitorProfession?: string;
  status: 'approved' | 'declined' | 'pending';
  reviewedAt?: string; // ISO date string
}

export interface WaliConversation {
  id: string;
  participantName: string;
  participantRole?: string; // e.g. "Wali of Ahmed Khan"
  lastMessage: string;
  lastMessageAt?: string; // ISO date string
  unread?: boolean;
}

export interface WaliDependentProfile {
  membershipId?: string;
  fullName?: string;
  age?: number;
  city?: string;
  sect?: string;
  educationLevel?: string;
  occupation?: string;
  bio?: string;
  onboardingComplete?: boolean;
  idVerified?: boolean;
  memberSince?: string;
  photos?: Array<{ id: string; url: string }>;
}

type WaliTab = 'review' | 'proposals' | 'conversations' | 'family';

interface WaliHomeScreenProps {
  waliName?: string;
  dependentName?: string;
  proposalCount?: number;
  proposal?: WaliProposal | null;
  activeTab?: WaliTab;
  onTabChange?: (tab: WaliTab) => void;
  onReview?: () => void;
  onOpenSettings?: () => void;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
  // Ward's discovery feed shown in "To review" tab
  wardIntroductions?: Introduction[];
  onViewIntroProfile?: (userId: string) => void;
  onIntroNotSuitable?: (userId: string) => void;
  onIntroSendProposal?: (userId: string, note: string) => Promise<void> | void;
  // Proposals tab
  reviewedProposals?: WaliReviewedProposal[];
  wardProposals?: WardProposal[];
  wardReceivedProposals?: WardReceivedProposal[];
  // Conversations tab
  conversations?: WaliConversation[];
  onOpenConversation?: (id: string) => void;
  // Family tab
  dependentProfile?: WaliDependentProfile;
  onViewDependentProfile?: () => void;
  onRemoveDependent?: (membershipId: string) => Promise<void>;
}

// ─── tab content components ───────────────────────────────────────────────────

function EmptyState({ icon, iconBg, title, body }: { icon: React.ReactNode; iconBg?: string; title: string; body: string }) {
  return (
    <View style={styles.emptyCard}>
      <View style={[styles.emptyIcon, iconBg ? { backgroundColor: iconBg } : undefined]}>{icon}</View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

// ─── ward introduction card ───────────────────────────────────────────────────

const SECT_LABELS: Record<string, string> = {
  SUNNI: 'Sunni', SHIA: 'Shia', AHMADI: 'Ahmadi', ISMAILI: 'Ismaili', OTHER: 'Other',
};
const RELIGIOSITY_LABELS: Record<string, string> = {
  VERY_PRACTICING: 'Very practicing', PRACTICING: 'Practicing',
  MODERATELY_PRACTICING: 'Moderately practicing',
  MODERATE: 'Moderate', CULTURAL: 'Cultural',
};
const EDUCATION_LABELS: Record<string, string> = {
  PRIMARY: 'Primary', SECONDARY: 'Secondary', HIGHER_SECONDARY: 'A-levels / FSc',
  HIGH_SCHOOL: 'High school', DIPLOMA: 'Diploma', BACHELORS: "Bachelor's",
  MASTERS: "Master's", DOCTORATE: 'PhD', PHD: 'PhD', OTHER: 'Other',
};
const MARITAL_LABELS: Record<string, string> = {
  NEVER_MARRIED: 'Single', DIVORCED: 'Divorced', WIDOWED: 'Widowed',
};

function WardIntroCard({
  intro,
  onViewProfile,
  onNotSuitable,
  onSendProposal,
}: {
  intro: Introduction;
  onViewProfile?: () => void;
  onNotSuitable?: () => void;
  onSendProposal?: (note: string) => Promise<void> | void;
}) {
  const sect = SECT_LABELS[intro.sect ?? ''] ?? null;
  const religiosity = RELIGIOSITY_LABELS[intro.religiosity ?? ''] ?? null;
  const subtitle = [sect, religiosity].filter(Boolean).join(' · ');
  const education = EDUCATION_LABELS[intro.educationLevel ?? ''] ?? intro.educationLevel ?? null;
  const height = formatHeight(intro.heightCm);
  const marital = MARITAL_LABELS[intro.maritalStatus ?? ''] ?? null;

  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [sending, setSending] = useState(false);
  const NOTE_LIMIT = 300;
  const sheetSlideAnim = useRef(new Animated.Value(500)).current;
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    if (!noteModalVisible) { setKbHeight(0); return; }
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => setKbHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKbHeight(0),
    );
    return () => { show.remove(); hide.remove(); };
  }, [noteModalVisible]);

  function openNoteModal() {
    setNoteText('');
    sheetSlideAnim.setValue(500);
    setNoteModalVisible(true);
    Animated.timing(sheetSlideAnim, {
      toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }

  function closeNoteModal() {
    Animated.timing(sheetSlideAnim, {
      toValue: 500, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: true,
    }).start(() => setNoteModalVisible(false));
  }

  const profileRows = [
    { label: 'Sect',           value: sect },
    { label: 'Religiosity',    value: religiosity },
    { label: 'Education',      value: education ?? '—' },
    { label: 'Profession',     value: intro.occupation ?? '—' },
    { label: 'Height',         value: height ?? '—' },
    { label: 'Marital status', value: marital },
    { label: 'Family',         value: intro.familyType },
  ].filter(r => r.value != null && r.value !== '') as { label: string; value: string }[];

  return (
    <View style={styles.introCard}>
      {/* Header: name + age·city + badges */}
      <View style={styles.introCardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.introName}>{intro.fullName || '—'}</Text>
          <Text style={styles.introSub}>{intro.age} · {intro.city ?? '—'}</Text>
          {!!subtitle && <Text style={styles.introRelig}>{subtitle}</Text>}
        </View>
        <View style={styles.introBadges}>
          {intro.idVerified && (
            <View style={styles.badgeMint}>
              <CheckBadge />
              <Text style={styles.badgeMintText}>ID verified</Text>
            </View>
          )}
          {intro.waliRegistered && (
            <View style={styles.badgeInd}>
              <ShieldIcon />
              <Text style={styles.badgeIndText}>Has wali</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      {/* Profile rows */}
      {profileRows.map(({ label, value }, i) => (
        <View key={label} style={[styles.row, i === 0 && { borderBottomWidth: 0 }]}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowValue}>{value}</Text>
        </View>
      ))}

      {/* Action buttons */}
      <View style={styles.introActions}>
        <Pressable
          onPress={onViewProfile}
          style={({ pressed }) => [styles.viewIntroBtn, pressed && { opacity: 0.75 }]}>
          <Text style={styles.viewIntroBtnText}>View full profile</Text>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"
            stroke={C.indInk} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 18l6-6-6-6" />
          </Svg>
        </Pressable>

        <View style={styles.introActionsRow}>
          <Pressable
            onPress={onNotSuitable}
            style={({ pressed }) => [styles.introNotSuitableBtn, pressed && { opacity: 0.75 }]}>
            <Text style={styles.introNotSuitableText}>Not interested</Text>
          </Pressable>

          <Pressable
            onPress={openNoteModal}
            style={({ pressed }) => [styles.introProposalBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}>
            <LinearGradient
              colors={['#F2559A', '#E6396E']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.introProposalBtnInner}>
              <Text style={styles.introProposalBtnText}>Send proposal</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {/* Note modal — bottom sheet */}
      <Modal
        visible={noteModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeNoteModal}>
        <View style={[noteStyles.overlay, kbHeight > 0 && { paddingBottom: kbHeight }]}>
          <Pressable style={{ flex: 1 }} onPress={closeNoteModal} />
          <Animated.View style={{ transform: [{ translateY: sheetSlideAnim }] }}>
            <View style={noteStyles.sheet}>
              <View style={noteStyles.handle} />
              <Text style={noteStyles.title}>Send proposal</Text>
              <Text style={noteStyles.subtitle}>
                Add a personal note to introduce yourself — optional but recommended.
              </Text>
              <TextInput
                style={noteStyles.input}
                value={noteText}
                onChangeText={t => setNoteText(t.slice(0, NOTE_LIMIT))}
                placeholder="e.g. Assalamu Alaikum, I came across your profile and felt we might be compatible…"
                placeholderTextColor="#9695A5"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
              <Text style={noteStyles.counter}>{noteText.length}/{NOTE_LIMIT}</Text>
              <View style={noteStyles.modalBtnRow}>
                <Pressable
                  onPress={closeNoteModal}
                  disabled={sending}
                  style={({ pressed }) => [noteStyles.cancelBtn, { opacity: sending ? 0.4 : pressed ? 0.7 : 1 }]}>
                  <Text style={noteStyles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  disabled={sending}
                  onPress={async () => {
                    if (sending) return;
                    setSending(true);
                    try { await onSendProposal?.(noteText.trim()); } catch {}
                    setSending(false);
                    closeNoteModal();
                  }}
                  style={({ pressed }) => [noteStyles.sendBtn, { opacity: sending ? 0.7 : pressed ? 0.88 : 1 }]}>
                  <LinearGradient
                    colors={['#F2559A', '#E6396E']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={noteStyles.sendBtnInner}>
                    {sending
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={noteStyles.sendText}>Send proposal</Text>}
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

// ─── review tab ───────────────────────────────────────────────────────────────

function ReviewTab({
  dependentName,
  wardIntroductions,
  wardProposals = [],
  wardReceivedProposals = [],
  onOpenDetail,
  onViewIntroProfile,
  onIntroNotSuitable,
  onIntroSendProposal,
}: {
  dependentName: string;
  wardIntroductions: Introduction[];
  wardProposals: WardProposal[];
  wardReceivedProposals: WardReceivedProposal[];
  onOpenDetail?: (sel: ProposalDetailSelection) => void;
  onViewIntroProfile?: (userId: string) => void;
  onIntroNotSuitable?: (userId: string) => void;
  onIntroSendProposal?: (userId: string, note: string) => Promise<void> | void;
}) {
  // Proposals the ward SENT that the wali needs to approve
  const pendingSent = wardProposals.filter(p => p.stage === 'HIS_WALI_PENDING');
  // Proposals the ward RECEIVED where sender's wali approved and now ward's wali must act
  const pendingReceived = wardReceivedProposals.filter(p => p.stage === 'HER_WALI_REVIEWING');
  const pendingCount = pendingSent.length + pendingReceived.length;

  const firstPendingSent = pendingSent[0] ?? null;
  const firstPendingReceived = pendingReceived[0] ?? null;

  function buildBannerSelection(): ProposalDetailSelection | null {
    if (firstPendingSent) {
      return {
        type: 'sent',
        proposal: {
          userId: firstPendingSent.toUserId,
          fullName: firstPendingSent.recipientName,
          sentAt: firstPendingSent.createdAt,
          matchId: null,
          stage: firstPendingSent.stage,
          // Without this the detail tracker falls back to self-sent and
          // contradicts the card the user just tapped.
          sentByWali: firstPendingSent.sentByWali,
          status: 'pending',
          age: firstPendingSent.recipientAge,
          city: firstPendingSent.recipientCity,
          countryCode: null, educationLevel: null,
          occupation: firstPendingSent.recipientOccupation,
          heightCm: null, maritalStatus: null, familyType: null,
          sect: null, madhhab: null, idVerified: false, waliRegistered: false,
        },
      };
    }
    if (firstPendingReceived) {
      return {
        type: 'received',
        proposal: {
          userId: firstPendingReceived.fromUserId,
          fullName: firstPendingReceived.senderName,
          sentAt: firstPendingReceived.createdAt,
          matchId: null,
          stage: firstPendingReceived.stage,
          sentByWali: firstPendingReceived.sentByWali,
          status: 'pending',
          age: firstPendingReceived.senderAge,
          city: firstPendingReceived.senderCity,
          countryCode: null, educationLevel: null,
          occupation: firstPendingReceived.senderOccupation,
          heightCm: null, maritalStatus: null, familyType: null,
          sect: null, madhhab: null, idVerified: false, waliRegistered: false,
        },
      };
    }
    return null;
  }

  const displayName = dependentName
    ? dependentName.includes(' ') ? dependentName.split(' ')[0] : dependentName
    : 'your dependent';
  const pronoun = dependentName ? 'She' : 'They';

  return (
    <>
      {/* Always-visible status card */}
      {pendingCount > 0 ? (
        /* Gold "NEEDS YOUR REVIEW" banner */
        <Pressable
          onPress={() => {
            const sel = buildBannerSelection();
            if (sel) onOpenDetail?.(sel);
          }}
          style={styles.proposalBanner}>
          <View style={styles.bannerKicker}>
            <View style={styles.dot} />
            <Text style={styles.kickerText}>NEEDS YOUR REVIEW</Text>
          </View>
          <Text style={styles.bannerHeading}>
            {pendingCount === 1 ? `1 proposal\nis waiting` : `${pendingCount} proposals\nare waiting`}
          </Text>
          <Text style={styles.bannerBody}>
Your approval is needed before {pendingCount === 1 ? 'this match moves' : 'these matches move'} forward.
          </Text>
        </Pressable>
      ) : (
        /* Feedback card when nothing is pending */
        <View style={styles.allReviewedCard}>
          <View style={styles.allReviewedIconWrap}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none"
              stroke={C.mintInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M5 12.5l5 5 9-10" />
            </Svg>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.allReviewedTitle}>All caught up</Text>
            <Text style={styles.allReviewedBody}>
              No proposals are waiting for your review right now.
            </Text>
          </View>
        </View>
      )}

      {/* Discovery feed — one introduction at a time.
          The parent (App.tsx) filters wardIntroductions to exclude proposed/skipped
          users, so we always show index 0. No local index needed. */}
      {wardIntroductions.length > 0 ? (
        <>
          <Text style={styles.introSectionLabel}>
            Introductions for {displayName}
          </Text>
          <WardIntroCard
            key={wardIntroductions[0].userId}
            intro={wardIntroductions[0]}
            onViewProfile={() => onViewIntroProfile?.(wardIntroductions[0].userId)}
            onNotSuitable={() => {
              onIntroNotSuitable?.(wardIntroductions[0].userId);
            }}
            onSendProposal={async (note) => {
              await onIntroSendProposal?.(wardIntroductions[0].userId, note);
            }}
          />
        </>
      ) : (
        <EmptyState
          iconBg={C.goldSoft}
          icon={
            <Svg width={32} height={32} viewBox="0 0 24 24" fill="none"
              stroke={C.goldInk} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={12} cy={12} r={9} />
              <Path d="M12 8v4M12 16h.01" />
            </Svg>
          }
          title="No introductions yet"
          body={`${displayName}'s profile is still being reviewed. Introductions will appear here once it's live.`}
        />
      )}
    </>
  );
}

// ─── proposals tab sub-components ────────────────────────────────────────────
type ChipVariant = 'gold' | 'mint' | 'rose' | 'ind';

const CHIP_COLORS: Record<ChipVariant, { bg: string; color: string }> = {
  gold: { bg: C.goldSoft, color: C.goldInk },
  mint: { bg: C.mintSoft, color: C.mintInk },
  rose: { bg: C.roseSoft, color: '#A31C48' },
  ind:  { bg: C.indSoft,  color: C.indInk  },
};

function WaliChip({ variant, label }: { variant: ChipVariant; label: string }) {
  const { bg, color } = CHIP_COLORS[variant];
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

function WaliProgressBar({ doneSteps }: { doneSteps: number }) {
  return (
    <View style={styles.progBar}>
      {[0, 1, 2, 3].map(i => {
        const bg =
          i < doneSteps ? C.mintInk
          : i === doneSteps && doneSteps < 4 ? C.rose
          : '#E4E2ED';
        return <View key={i} style={[styles.progSeg, { backgroundColor: bg }]} />;
      })}
    </View>
  );
}

function chipForStatus(status: WaliReviewedProposal['status']): { variant: ChipVariant; label: string; doneSteps: number } {
  if (status === 'approved') return { variant: 'mint', label: 'Approved',          doneSteps: 2 };
  if (status === 'declined') return { variant: 'rose', label: 'Declined',          doneSteps: 1 };
  return                            { variant: 'gold', label: 'Needs your review', doneSteps: 0 };
}

function fmtProposalDate(iso?: string, type: 'sent' | 'received' = 'sent'): string {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  const prefix = type === 'received' ? 'Received' : 'Sent';
  if (days === 0) return `${prefix} today`;
  if (days === 1) return `${prefix} yesterday`;
  if (days < 7)  return `${prefix} ${new Date(iso).toLocaleDateString('en-US', { weekday: 'long' })}`;
  return `${prefix} ${days} days ago`;
}

// Stage labels from the SENDER's perspective (ward sent the proposal)
const SENT_STAGE_CONFIG: Record<WardProposal['stage'], { variant: ChipVariant; label: string }> = {
  HIS_WALI_PENDING:     { variant: 'gold', label: 'Awaiting your approval' },
  HER_WALI_REVIEWING:   { variant: 'ind',  label: 'Sent — under review' },
  HER_DECISION_PENDING: { variant: 'ind',  label: 'She is deciding' },
  ACCEPTED:             { variant: 'mint', label: 'Accepted' },
  DECLINED:             { variant: 'ind',  label: 'Not taken forward' },
  WITHDRAWN:            { variant: 'ind',  label: 'Withdrawn' },
};

// Stage labels from the RECIPIENT's perspective (ward received the proposal)
const RECEIVED_STAGE_CONFIG: Record<WardReceivedProposal['stage'], { variant: ChipVariant; label: string }> = {
  HIS_WALI_PENDING:     { variant: 'ind',  label: "Pending sender's wali" },
  HER_WALI_REVIEWING:   { variant: 'gold', label: 'Awaiting your approval' },
  HER_DECISION_PENDING: { variant: 'ind',  label: 'With your ward' },
  ACCEPTED:             { variant: 'mint', label: 'Accepted' },
  DECLINED:             { variant: 'ind',  label: 'Not taken forward' },
  WITHDRAWN:            { variant: 'ind',  label: 'Withdrawn' },
};

function ProposalsTab({
  wardProposals,
  wardReceivedProposals,
  dependentName,
  onOpenDetail,
}: {
  wardProposals: WardProposal[];
  wardReceivedProposals: WardReceivedProposal[];
  dependentName: string;
  onOpenDetail?: (sel: ProposalDetailSelection) => void;
}) {
  const [propTab, setPropTab] = useState<'sent' | 'received'>('sent');
  const depFirst = dependentName
    ? (dependentName.includes(' ') ? dependentName.split(' ')[0] : dependentName)
    : 'your dependent';

  return (
    <>
      <Text style={styles.proposalsTitle}>Proposals</Text>

      {/* Segmented control */}
      <View style={styles.seg}>
        <Pressable
          onPress={() => setPropTab('sent')}
          style={[styles.sgItem, propTab === 'sent' && styles.sgItemOn]}>
          <View style={styles.sgInner}>
            <Text style={[styles.sgText, propTab === 'sent' && styles.sgTextOn]}>Sent</Text>
            {wardProposals.length > 0 && (
              <View style={[styles.sgBadge, propTab === 'sent' ? styles.sgBadgeOn : styles.sgBadgeOff]}>
                <Text style={[styles.sgBadgeText, propTab === 'sent' && styles.sgBadgeTextOn]}>
                  {wardProposals.length}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
        <Pressable
          onPress={() => setPropTab('received')}
          style={[styles.sgItem, propTab === 'received' && styles.sgItemOn]}>
          <View style={styles.sgInner}>
            <Text style={[styles.sgText, propTab === 'received' && styles.sgTextOn]}>Received</Text>
            {wardReceivedProposals.length > 0 && (
              <View style={[styles.sgBadge, propTab === 'received' ? styles.sgBadgeOn : styles.sgBadgeOff]}>
                <Text style={[styles.sgBadgeText, propTab === 'received' && styles.sgBadgeTextOn]}>
                  {wardReceivedProposals.length}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      {/* Sent tab = proposals the ward sent to others */}
      {propTab === 'sent' ? (
        wardProposals.length === 0 ? (
          <View style={styles.propEmptyCard}>
            <View style={styles.propEmptyIcon}>
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none"
                stroke="#8C86A8" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <Rect x={3} y={5} width={18} height={14} rx={3} />
                <Path d="M3.5 7.5l8.5 6 8.5-6" />
              </Svg>
            </View>
            <Text style={styles.propEmptyTitle}>No proposals sent yet</Text>
            <Text style={styles.propEmptyBody}>
              When {depFirst} sends a proposal, you'll see it here to review and approve.
            </Text>
          </View>
        ) : (
          wardProposals.map(p => {
            const { variant, label } = SENT_STAGE_CONFIG[p.stage] ?? SENT_STAGE_CONFIG.HIS_WALI_PENDING;
            const { doneCount: doneSteps } = buildProposalSteps({
              stage: p.stage,
              viewer: 'suitorWali',
              origin: p.sentByWali ? 'wali' : 'self',
              suitorHasWali: p.suitorHasWali,
              recipientHasWali: p.recipientHasWali,
            });
            const who = [
              p.recipientName ?? null,
              p.recipientAge ? `${p.recipientAge} yrs` : null,
              p.recipientCity ?? null,
            ].filter(Boolean).join(' · ') || '—';
            const meta = fmtProposalDate(p.createdAt, 'sent');
            return (
              <Pressable
                key={p.id}
                style={({ pressed }) => [styles.propCard, pressed && { opacity: 0.82 }]}
                onPress={() => onOpenDetail?.({
                  type: 'sent',
                  proposal: {
                    userId: p.toUserId,
                    fullName: p.recipientName,
                    sentAt: p.createdAt,
                    matchId: null,
                    stage: p.stage,
                    sentByWali: p.sentByWali,
                    status: p.stage === 'ACCEPTED' ? 'matched' : 'pending',
                    age: p.recipientAge,
                    city: p.recipientCity,
                    countryCode: null,
                    educationLevel: null,
                    occupation: p.recipientOccupation,
                    heightCm: null,
                    maritalStatus: null,
                    familyType: null,
                    sect: null,
                    madhhab: null,
                    idVerified: false,
                    waliRegistered: false,
                  },
                })}>
                <View style={styles.propInner}>
                  <View style={styles.propTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.propWho}>{who}</Text>
                      {!!p.recipientOccupation && <Text style={styles.propSub}>{p.recipientOccupation}</Text>}
                      {!!meta && <Text style={styles.propMeta}>{meta}</Text>}
                    </View>
                    <WaliChip variant={variant} label={label} />
                  </View>
                  <WaliProgressBar doneSteps={doneSteps} />
                </View>
              </Pressable>
            );
          })
        )
      ) : (
        /* Received tab = proposals others sent to the ward */
        wardReceivedProposals.length === 0 ? (
          <View style={styles.propEmptyCard}>
            <View style={styles.propEmptyIcon}>
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none"
                stroke="#8C86A8" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <Rect x={3} y={5} width={18} height={14} rx={3} />
                <Path d="M3.5 7.5l8.5 6 8.5-6" />
              </Svg>
            </View>
            <Text style={styles.propEmptyTitle}>No proposals received yet</Text>
            <Text style={styles.propEmptyBody}>
              When someone sends {depFirst} a proposal, it will appear here.
            </Text>
          </View>
        ) : (
          wardReceivedProposals.map(p => {
            const { variant, label } = RECEIVED_STAGE_CONFIG[p.stage] ?? RECEIVED_STAGE_CONFIG.HIS_WALI_PENDING;
            const { doneCount: doneSteps } = buildProposalSteps({
              stage: p.stage,
              viewer: 'recipientWali',
              origin: p.sentByWali ? 'wali' : 'self',
              suitorHasWali: p.suitorHasWali,
              recipientHasWali: p.recipientHasWali,
            });
            const who = [
              p.senderName ?? null,
              p.senderAge ? `${p.senderAge} yrs` : null,
              p.senderCity ?? null,
            ].filter(Boolean).join(' · ') || '—';
            const meta = fmtProposalDate(p.createdAt, 'received');
            return (
              <Pressable
                key={p.id}
                style={({ pressed }) => [styles.propCard, pressed && { opacity: 0.82 }]}
                onPress={() => onOpenDetail?.({
                  type: 'received',
                  proposal: {
                    userId: p.fromUserId,
                    fullName: p.senderName,
                    sentAt: p.createdAt,
                    matchId: null,
                    stage: p.stage,
                    sentByWali: p.sentByWali,
                    status: p.stage === 'ACCEPTED' ? 'matched' : 'pending',
                    age: p.senderAge,
                    city: p.senderCity,
                    countryCode: null,
                    educationLevel: null,
                    occupation: p.senderOccupation,
                    heightCm: null,
                    maritalStatus: null,
                    familyType: null,
                    sect: null,
                    madhhab: null,
                    idVerified: false,
                    waliRegistered: false,
                  },
                })}>
                <View style={styles.propInner}>
                  <View style={styles.propTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.propWho}>{who}</Text>
                      {!!p.senderOccupation && <Text style={styles.propSub}>{p.senderOccupation}</Text>}
                      {!!meta && <Text style={styles.propMeta}>{meta}</Text>}
                    </View>
                    <WaliChip variant={variant} label={label} />
                  </View>
                  <WaliProgressBar doneSteps={doneSteps} />
                </View>
              </Pressable>
            );
          })
        )
      )}
    </>
  );
}

function ConversationsTab({
  conversations,
  onOpenConversation,
}: {
  conversations: WaliConversation[];
  onOpenConversation?: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return (
      <EmptyState
        iconBg={C.indSoft}
        icon={
          <Svg width={32} height={32} viewBox="0 0 24 24" fill="none"
            stroke={C.indInk} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
          </Svg>
        }
        title="No conversations yet"
        body="When an approved suitor's wali reaches out, the conversation will appear here."
      />
    );
  }

  return (
    <>
      <Text style={styles.sectionLabel}>Conversations</Text>
      <View style={styles.listCard}>
        {conversations.map((conv, i) => (
          <Pressable
            key={conv.id}
            onPress={() => onOpenConversation?.(conv.id)}
            style={({ pressed }) => [
              styles.listRow,
              i === 0 && styles.listRowFirst,
              pressed && { opacity: 0.75 },
            ]}>
            <View style={[styles.listAvatar, conv.unread && styles.listAvatarUnread]}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
                stroke={conv.unread ? C.rose : C.ink3} strokeWidth={1.8}
                strokeLinecap="round" strokeLinejoin="round">
                <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.convNameRow}>
                <Text style={[styles.listTitle, conv.unread && styles.listTitleBold]}>
                  {conv.participantName}
                </Text>
                {conv.unread && <View style={styles.unreadDot} />}
              </View>
              {!!conv.participantRole && (
                <Text style={styles.listSub}>{conv.participantRole}</Text>
              )}
              <Text style={styles.convLastMsg} numberOfLines={1}>{conv.lastMessage}</Text>
            </View>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
              stroke={C.ink3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M9 18l6-6-6-6" />
            </Svg>
          </Pressable>
        ))}
      </View>
    </>
  );
}

function FamilyTab({
  dependentName,
  waliName,
  profile,
  onViewProfile,
  onRemoveDependent,
}: {
  dependentName: string;
  waliName: string;
  profile?: WaliDependentProfile;
  onViewProfile?: () => void;
  onRemoveDependent?: (membershipId: string) => Promise<void>;
}) {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [removing, setRemoving] = useState(false);

  const firstName = dependentName
    ? (dependentName.includes(' ') ? dependentName.split(' ')[0] : dependentName)
    : 'Dependent';

  const photos = profile?.photos ?? [];
  const coverPhoto = photos[0]?.url ?? null;

  async function handleConfirmRemove() {
    if (!profile?.membershipId || !onRemoveDependent) return;
    setRemoving(true);
    try {
      await onRemoveDependent(profile.membershipId);
    } finally {
      setRemoving(false);
      setShowRemoveDialog(false);
    }
  }

  return (
    <>
      {/* Linked accounts card */}
      <View style={styles.linkedCard}>
        {/* Header */}
        <View style={styles.linkedCardHeader}>
          <Text style={styles.linkedCardTitle}>Linked accounts</Text>
          {dependentName ? (
            <View style={styles.linkedCountBadge}>
              <Text style={styles.linkedCountText}>✓  1 linked</Text>
            </View>
          ) : null}
        </View>

        {/* Body: wali column | divider | dependents list */}
        <View style={styles.linkedCardBody}>
          {/* Wali side */}
          <View style={styles.waliCol}>
            <View style={styles.waliAvatar}>
              <Text style={styles.waliAvatarText}>{waliName[0]?.toUpperCase() ?? 'W'}</Text>
            </View>
            <Text style={styles.waliColName}>You</Text>
            <Text style={styles.waliColRole}>Guardian</Text>
          </View>

          {/* Vertical separator */}
          <View style={styles.vSep} />

          {/* Dependents list */}
          <View style={styles.depsCol}>
            {dependentName ? (
              <View style={styles.depRow}>
                <View style={styles.depAvatar}>
                  <Text style={styles.depAvatarText}>{firstName[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.depRowName}>{firstName}</Text>
                  <Text style={styles.depRowRole}>Dependent</Text>
                </View>
                <Pressable
                  onPress={() => setShowRemoveDialog(true)}
                  hitSlop={8}
                  style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>Remove</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.noDepText}>No dependents linked yet.</Text>
            )}
          </View>
        </View>

        {/* Add dependent */}
        <Pressable style={styles.addDepBtn}>
          <Text style={styles.addDepBtnText}>+  Add dependent</Text>
        </Pressable>
      </View>

      {/* Dependent profile card */}
      <Text style={styles.sectionLabel}>{firstName}'s profile</Text>
      <View style={styles.profileCard}>
        {/* Photo strip */}
        {photos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.photoStrip}
            contentContainerStyle={styles.photoStripContent}>
            {photos.map((p, i) => (
              <Image
                key={p.id}
                source={{ uri: p.url }}
                style={[styles.photoThumb, i === 0 && styles.photoThumbFirst]}
              />
            ))}
          </ScrollView>
        )}

        {profile?.onboardingComplete === false ? (
          <View style={styles.incompleteRow}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
              stroke={C.goldInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={12} cy={12} r={9} />
              <Path d="M12 8v4M12 16h.01" />
            </Svg>
            <Text style={styles.incompleteText}>
              {firstName} hasn't finished setting up their profile yet.
            </Text>
          </View>
        ) : null}

        {[
          { label: 'Age',         value: profile?.age ? `${profile.age} years` : undefined },
          { label: 'City',        value: profile?.city },
          { label: 'Education',   value: profile?.educationLevel },
          { label: 'Occupation',  value: profile?.occupation },
          { label: 'Sect',        value: profile?.sect },
        ].map(({ label, value }) =>
          value ? (
            <View key={label} style={styles.row}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={styles.rowValue}>{value}</Text>
            </View>
          ) : null,
        )}

        {!!profile?.bio && (
          <>
            <View style={styles.divider} />
            <Text style={styles.bioLabel}>About</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </>
        )}

        {/* Badges */}
        <View style={[styles.divider, { marginTop: 8 }]} />
        <View style={styles.badgesRow}>
          {profile?.idVerified ? (
            <View style={styles.badgeMint}>
              <CheckBadge />
              <Text style={styles.badgeMintText}>ID verified</Text>
            </View>
          ) : (
            <View style={styles.badgeGrey}>
              <Text style={styles.badgeGreyText}>ID not verified</Text>
            </View>
          )}
          <View style={styles.badgeInd}>
            <ShieldIcon />
            <Text style={styles.badgeIndText}>Wali registered</Text>
          </View>
        </View>

        {/* View full profile button */}
        <Pressable
          onPress={onViewProfile}
          style={({ pressed }) => [styles.viewProfileBtn, pressed && { opacity: 0.75 }]}>
          <Text style={styles.viewProfileBtnText}>View full profile</Text>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
            stroke={C.indInk} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 18l6-6-6-6" />
          </Svg>
        </Pressable>
      </View>

      {/* Remove dependent confirmation dialog */}
      <Modal
        visible={showRemoveDialog}
        transparent
        animationType="fade"
        onRequestClose={() => !removing && setShowRemoveDialog(false)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            {/* Warning icon */}
            <View style={styles.dialogIconWrap}>
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none"
                stroke={C.rose} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <Path d="M12 9v4M12 17h.01" />
              </Svg>
            </View>

            <Text style={styles.dialogTitle}>Remove {firstName}?</Text>
            <Text style={styles.dialogBody}>
              This will permanently unlink {firstName} from your guardian account.
              {'\n\n'}They will need to send a new invitation if they want to add a wali again.
            </Text>

            <View style={styles.dialogBtns}>
              <Pressable
                onPress={() => setShowRemoveDialog(false)}
                disabled={removing}
                style={({ pressed }) => [styles.dialogBtnCancel, pressed && { opacity: 0.7 }]}>
                <Text style={styles.dialogBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmRemove}
                disabled={removing}
                style={({ pressed }) => [styles.dialogBtnRemove, pressed && { opacity: 0.85 }]}>
                {removing
                  ? <ActivityIndicator color={C.white} size="small" />
                  : <Text style={styles.dialogBtnRemoveText}>Remove</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── component ────────────────────────────────────────────────────────────────
export function WaliHomeScreen({
  waliName = 'Imran',
  dependentName = '',
  proposalCount = 0,
  proposal,
  activeTab = 'review',
  onTabChange,
  onReview,
  onOpenSettings,
  onRefresh,
  loading = false,
  wardIntroductions = [],
  onViewIntroProfile,
  onIntroNotSuitable,
  onIntroSendProposal,
  reviewedProposals = [],
  wardProposals = [],
  wardReceivedProposals = [],
  conversations = [],
  onOpenConversation,
  dependentProfile,
  onViewDependentProfile,
  onRemoveDependent,
}: WaliHomeScreenProps) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const [proposalDetail, setProposalDetail] = useState<ProposalDetailSelection | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;

  const openProposalDetail = useCallback((sel: ProposalDetailSelection) => {
    setProposalDetail(sel);
    setDetailVisible(true);
    slideAnim.setValue(screenWidth);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slideAnim, screenWidth]);

  const closeProposalDetail = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: screenWidth,
      duration: 250,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setProposalDetail(null);
      setDetailVisible(false);
    });
  }, [slideAnim, screenWidth]);

  async function handleRefresh() {
    if (!onRefresh) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }

  function renderTabContent() {
    if (loading) {
      switch (activeTab) {
        case 'review':        return <ReviewTabSkeleton />;
        case 'proposals':     return <ProposalsTabSkeleton />;
        case 'conversations': return <ConversationsTabSkeleton />;
        case 'family':        return <FamilyTabSkeleton />;
      }
    }
    switch (activeTab) {
      case 'review':
        return (
          <ReviewTab
            dependentName={dependentName}
            wardIntroductions={wardIntroductions}
            wardProposals={wardProposals}
            wardReceivedProposals={wardReceivedProposals}
            onOpenDetail={openProposalDetail}
            onViewIntroProfile={onViewIntroProfile}
            onIntroNotSuitable={onIntroNotSuitable}
            onIntroSendProposal={onIntroSendProposal}
          />
        );
      case 'proposals':
        return (
          <ProposalsTab
            wardProposals={wardProposals}
            wardReceivedProposals={wardReceivedProposals}
            dependentName={dependentName}
            onOpenDetail={openProposalDetail}
          />
        );
      case 'conversations':
        return (
          <ConversationsTab
            conversations={conversations}
            onOpenConversation={onOpenConversation}
          />
        );
      case 'family':
        return (
          <FamilyTab
            dependentName={dependentName}
            waliName={waliName}
            profile={dependentProfile}
            onViewProfile={onViewDependentProfile}
            onRemoveDependent={onRemoveDependent}
          />
        );
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Assalamu alaikum,</Text>
          <Text style={styles.subGreeting}>
            {waliName || 'Your dashboard'}
          </Text>
        </View>
        <Pressable onPress={onOpenSettings} hitSlop={8} style={styles.settingsBtn}>
          <SettingsIcon />
        </Pressable>
      </View>

      <ScrollView
        key={activeTab}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={C.rose}
            colors={[C.rose]}
          />
        }>
        {renderTabContent()}
      </ScrollView>

      {/* Proposal detail slide-in overlay */}
      {detailVisible && proposalDetail && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateX: slideAnim }], backgroundColor: '#F6F5FA' },
          ]}>
          <ProposalDetailScreen
            selected={proposalDetail}
            onBack={closeProposalDetail}
            isWaliView
            wardName={dependentName}
          />
        </Animated.View>
      )}

      {/* Bottom tab bar */}
      <View style={[styles.tabBarWrap, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.tabBar}>
          {(
            [
              { id: 'review',        label: 'To review',    Icon: HomeIcon },
              { id: 'proposals',     label: 'Proposals',    Icon: ProposalsIcon },
              { id: 'conversations', label: 'Conversations', Icon: ChatIcon },
              { id: 'family',        label: 'Family',        Icon: FamilyIcon },
            ] as const
          ).map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            const pendingReviewCount =
              wardProposals.filter(p => p.stage === 'HIS_WALI_PENDING').length +
              wardReceivedProposals.filter(p => p.stage === 'HER_WALI_REVIEWING').length;
            const badge = id === 'review' && pendingReviewCount > 0 ? pendingReviewCount : 0;
            return (
              <Pressable
                key={id}
                onPress={() => onTabChange?.(id)}
                style={styles.tab}>
                <View style={styles.tabIconWrap}>
                  <Icon active={isActive} />
                  {badge > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {label}
                </Text>
                {isActive && <View style={styles.tabDot} />}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.page,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 34,
    color: C.ink,
  },
  subGreeting: {
    fontSize: 14,
    color: C.ink3,
    marginTop: 4,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: 'rgba(40,30,80,0.07)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // ── All-reviewed feedback card ──
  allReviewedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.mintSoft,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  allReviewedIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(10,92,67,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  allReviewedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.mintInk,
    marginBottom: 2,
  },
  allReviewedBody: {
    fontSize: 13,
    color: '#237A5C',
    lineHeight: 19,
  },

  // ── Gold banner ──
  proposalBanner: {
    backgroundColor: C.goldBg,
    borderRadius: 22,
    padding: 22,
    marginBottom: 14,
  },
  bannerKicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  kickerText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
  },
  bannerHeading: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 38,
    color: C.white,
    marginBottom: 12,
  },
  bannerBody: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 21,
  },

  // ── Profile card ──
  profileCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 18,
    shadowColor: 'rgba(40,30,80,1)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 14,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  profileAge: {
    fontSize: 18,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.4,
  },
  profileSect: {
    fontSize: 13,
    color: C.ink3,
    marginTop: 3,
  },
  badges: {
    gap: 6,
    alignItems: 'flex-end',
  },
  badgeMint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E5F6F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeMintText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0A5C43',
  },
  badgeInd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.indSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeIndText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: C.indInk,
  },
  divider: {
    height: 1,
    backgroundColor: C.line,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  rowLabel: {
    fontSize: 13.5,
    color: C.ink3,
  },
  rowValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: C.ink,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  reviewBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.indSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: C.indInk,
  },

  // ── Empty state ──
  emptyCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    shadowColor: 'rgba(40,30,80,1)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 3,
    marginTop: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.ink,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 13.5,
    color: C.ink3,
    textAlign: 'center',
    lineHeight: 21,
  },

  // ── Tab bar ──
  tabBarWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: 26,
    paddingVertical: 10,
    paddingHorizontal: 8,
    shadowColor: 'rgba(40,30,80,1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  tabIconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.rose,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.white,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.ink3,
  },
  tabLabelActive: {
    color: C.rose,
    fontWeight: '700',
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.rose,
    marginTop: 1,
  },

  // ── Intro section label ──
  introSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: C.ink2,
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },

  // ── Ward intro card ──
  introCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 18,
    shadowColor: 'rgba(40,30,80,1)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 12,
  },
  introCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  introName: {
    fontSize: 17,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.3,
  },
  introSub: {
    fontSize: 13.5,
    color: C.ink2,
    marginTop: 2,
  },
  introRelig: {
    fontSize: 12.5,
    color: C.ink3,
    marginTop: 2,
  },
  introBadges: {
    gap: 5,
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  viewIntroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 14,
    height: 44,
    borderRadius: 13,
    backgroundColor: C.indSoft,
  },
  viewIntroBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: C.indInk,
  },

  // ── Section label ──
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: C.ink3,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 2,
  },

  // ── Shared list card ──
  listCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: 'rgba(40,30,80,1)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 14,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  listRowFirst: {
    borderTopWidth: 0,
  },
  listAvatar: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: C.indSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  listAvatarUnread: {
    backgroundColor: C.roseSoft,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
  },
  listTitleBold: {
    fontWeight: '800',
  },
  listSub: {
    fontSize: 12,
    color: C.ink3,
    marginTop: 1,
  },

  // ── Proposals tab ──
  proposalsTitle: {
    fontSize: 26, fontWeight: '700', letterSpacing: -0.6,
    color: C.ink, marginTop: 8, marginBottom: 4, paddingHorizontal: 2,
  },
  seg: {
    flexDirection: 'row', backgroundColor: '#EDEBF4',
    borderRadius: 14, padding: 4, marginTop: 8, marginBottom: 14,
  },
  sgItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 11 },
  sgInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sgBadge: { borderRadius: 9, minWidth: 18, height: 18, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  sgBadgeOn: { backgroundColor: C.roseSoft },
  sgBadgeOff: { backgroundColor: '#DDDAE8' },
  sgBadgeText: { fontSize: 11, fontWeight: '700', color: C.ink3 },
  sgBadgeTextOn: { color: C.rose },
  sgItemOn: {
    backgroundColor: C.white,
    shadowColor: 'rgba(40,30,80,0.08)', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  sgText: { fontSize: 13.5, fontWeight: '700', color: C.ink3 },
  sgTextOn: { color: C.rose, fontWeight: '700' },
  propCard: {
    backgroundColor: C.white, borderRadius: 24,
    shadowColor: 'rgba(40,30,80,0.055)', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1, shadowRadius: 14, elevation: 2,
    marginBottom: 13, overflow: 'hidden',
  },
  propInner: { padding: 16, paddingHorizontal: 18, gap: 11 },
  propTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 9 },
  propWho: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: C.ink },
  propSub: { fontSize: 12.5, color: C.ink2, marginTop: 2 },
  propMeta: { fontSize: 11.5, color: C.ink3, marginTop: 5 },
  chip: { paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8, flexShrink: 0 },
  chipText: { fontSize: 10.5, fontWeight: '700' },
  progBar: {
    height: 5, borderRadius: 4, backgroundColor: '#EDECF3',
    flexDirection: 'row', gap: 3, overflow: 'hidden',
  },
  progSeg: { flex: 1, borderRadius: 4 },
  propEmptyCard: {
    backgroundColor: C.white, borderRadius: 24,
    shadowColor: 'rgba(40,30,80,0.055)', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1, shadowRadius: 14, elevation: 2,
    marginBottom: 13, alignItems: 'center',
    paddingTop: 44, paddingBottom: 44, paddingHorizontal: 22,
  },
  propEmptyIcon: {
    width: 66, height: 66, borderRadius: 22,
    backgroundColor: '#EFEDF6',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  propEmptyTitle: { fontSize: 17, fontWeight: '700', color: C.ink, marginBottom: 6 },
  propEmptyBody: { fontSize: 13, color: C.ink2, lineHeight: 20.8, textAlign: 'center' },

  // ── Conversations tab ──
  convNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  convLastMsg: {
    fontSize: 12,
    color: C.ink3,
    marginTop: 2,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.rose,
  },

  // ── Family tab — Linked accounts card ──
  linkedCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 20,
    marginBottom: 4,
    marginTop: 8,
    shadowColor: 'rgba(40,30,80,1)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 3,
  },
  linkedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  linkedCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
    letterSpacing: -0.3,
  },
  linkedCountBadge: {
    backgroundColor: C.mintSoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  linkedCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.mintInk,
  },
  linkedCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  waliCol: {
    alignItems: 'center',
    gap: 6,
    width: 68,
  },
  waliAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.indInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waliAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  waliColName: {
    fontSize: 13,
    fontWeight: '700',
    color: C.ink,
  },
  waliColRole: {
    fontSize: 11,
    color: C.ink3,
  },
  vSep: {
    width: 1,
    backgroundColor: C.line,
    alignSelf: 'stretch',
  },
  depsCol: {
    flex: 1,
    gap: 8,
  },
  depRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.page,
    borderRadius: 14,
    padding: 12,
  },
  depAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.indInk,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  depAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  depRowName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
  },
  depRowRole: {
    fontSize: 12,
    color: C.ink3,
    marginTop: 1,
  },
  noDepText: {
    fontSize: 13,
    color: C.ink3,
    paddingVertical: 8,
  },
  addDepBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDepBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: C.ink2,
  },

  // ── Remove button (in dep row) ──
  removeBtn: {
    backgroundColor: C.roseSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  removeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.rose,
  },

  // ── Remove confirmation dialog ──
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,8,30,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  dialogCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: 'rgba(40,30,80,1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  dialogIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: C.roseSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.4,
    marginBottom: 10,
    textAlign: 'center',
  },
  dialogBody: {
    fontSize: 13.5,
    color: C.ink2,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  dialogBtns: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  dialogBtnCancel: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBtnCancelText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: C.ink2,
  },
  dialogBtnRemove: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.rose,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBtnRemoveText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: C.white,
  },

  incompleteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.goldSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  incompleteText: {
    flex: 1,
    fontSize: 12.5,
    color: C.goldInk,
    lineHeight: 18,
  },
  bioLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: C.ink3,
    marginTop: 14,
    marginBottom: 6,
  },
  bioText: {
    fontSize: 13.5,
    color: C.ink2,
    lineHeight: 21,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  badgeGrey: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F2F1F7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeGreyText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#6E6B80',
  },

  // ── Photo strip ──
  photoStrip: {
    marginHorizontal: -18,
    marginBottom: 14,
  },
  photoStripContent: {
    paddingHorizontal: 18,
    gap: 8,
  },
  photoThumb: {
    width: 110,
    height: 130,
    borderRadius: 14,
    backgroundColor: C.line,
  },
  photoThumbFirst: {
    // first thumb has no extra style — handled by gap
  },

  // ── Intro card action buttons ──
  introActions: {
    marginTop: 14,
    gap: 10,
  },
  introActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  introNotSuitableBtn: {
    flex: 1,
    height: 44,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#EEEDF3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introNotSuitableText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#5F5E70',
  },
  introProposalBtn: {
    flex: 1.4,
    height: 44,
    borderRadius: 13,
    overflow: 'hidden',
  },
  introProposalBtnInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  introProposalBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── View full profile button ──
  viewProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EEECF8',
  },
  viewProfileBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#332C66',
  },
});

// ─── note modal styles ────────────────────────────────────────────────────────
const noteStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(27,22,48,0.5)',
  },
  sheet: {
    backgroundColor: C.page,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(155,123,240,0.3)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: C.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: C.ink2,
    lineHeight: 19,
    marginBottom: 16,
  },
  input: {
    minHeight: 110,
    borderRadius: 16,
    backgroundColor: C.white,
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.25)',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14.5,
    color: C.ink,
    lineHeight: 21,
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  counter: {
    fontSize: 11,
    color: C.ink3,
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 20,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink2,
  },
  sendBtn: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sendBtnInner: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: {
    fontSize: 15,
    fontWeight: '800',
    color: C.white,
  },
});
