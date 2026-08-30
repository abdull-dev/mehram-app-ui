/**
 * ProposalDetailScreen — PR6, PR7
 *
 * PR6: Sent proposal detail   (tapped a sent proposal row)
 * PR7: Received proposal detail (tapped a received proposal row)
 *
 * Pixel-perfect implementation matching mehram-proposals-chats.html.
 */

import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { withdrawProposal } from '../../api/proposals';
import { buildProposalSteps, type ProposalFlow } from '../../lib/proposalSteps';
import { withdrawWardProposal } from '../../api/wali';
import type { ProposalStage, ReceivedProposal, SentProposal } from '../../api/proposals';
import { formatHeight } from '../../utils/height';

// ─── design tokens ────────────────────────────────────────────────────────────
const C = {
  rose:      '#E6396E',
  roseInk:   '#A31C48',
  roseSoft:  '#FDECF2',
  indSoft:   '#EEECF8',
  indInk:    '#332C66',
  mint:      '#17B07E',
  mintSoft:  '#E5F6F0',
  mintInk:   '#0A5C43',
  goldSoft:  '#FBF2DE',
  goldInk:   '#7A5709',
  greySoft:  '#F2F1F7',
  greyInk:   '#5F5E70',
  page:      '#F6F5FA',
  line:      '#EEEDF3',
  ink:       '#17171F',
  ink2:      '#5F5E70',
  ink3:      '#9695A5',
} as const;

// ─── label maps ───────────────────────────────────────────────────────────────
const EDUCATION_LABELS: Record<string, string> = {
  NO_FORMAL: 'No formal education',
  PRIMARY: 'Primary',
  SECONDARY: 'Secondary / O-Level',
  HIGHER_SECONDARY: 'Higher Secondary / A-Level',
  DIPLOMA: 'Diploma / Certificate',
  BACHELORS: "Bachelor's degree",
  MASTERS: "Master's degree",
  PHD: 'PhD / Doctorate',
  OTHER: 'Other',
};

const MARITAL_LABELS: Record<string, string> = {
  SINGLE: 'Single',
  DIVORCED: 'Divorced',
  WIDOWED: 'Widowed',
  SEPARATED: 'Separated',
};

const FAMILY_TYPE_LABELS: Record<string, string> = {
  NUCLEAR: 'Nuclear family',
  JOINT: 'Joint family',
  EXTENDED: 'Extended family',
};

const SECT_LABELS: Record<string, string> = {
  SUNNI: 'Sunni', SHIA: 'Shia', AHMADIYYA: 'Ahmadiyya', IBADI: 'Ibadi', OTHER: 'Other',
};

const MADHHAB_LABELS: Record<string, string> = {
  HANAFI: 'Hanafi', MALIKI: 'Maliki', SHAFII: "Shafi'i",
  HANBALI: 'Hanbali', JAFARI: "Ja'fari", ZAIDI: 'Zaidi', OTHER: 'Other',
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmt(map: Record<string, string>, val?: string | null): string | null {
  if (!val) return null;
  return map[val] ?? val;
}

function fmtSect(sect?: string | null, madhhab?: string | null): string | null {
  const s = sect ? SECT_LABELS[sect] ?? sect : null;
  const m = madhhab ? MADHHAB_LABELS[madhhab] ?? madhhab : null;
  if (s && m) return `${s} (${m})`;
  return s ?? null;
}

function fmtStepTime(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-US', { weekday: 'long' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day}, ${time}`;
}

// ─── icons ────────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={C.indInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function LockIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none"
      stroke={C.ink3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={11} width={16} height={10} rx={2.5} />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  );
}

function ClockIcon({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3z" />
      <Path d="M12 7v5l3 2" />
    </Svg>
  );
}

function FamilyIcon({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Path d="M9 3.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </Svg>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────
function TopBar({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <View style={styles.topBar}>
      <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
        <BackIcon />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={styles.topBarTitle}>{title}</Text>
        <Text style={styles.topBarSub}>{subtitle}</Text>
      </View>
    </View>
  );
}

// ─── Banner ───────────────────────────────────────────────────────────────────
type BannerVariant = 'mint' | 'gold' | 'ind';

const BANNER_COLORS: Record<BannerVariant, { bg: string; title: string; body: string }> = {
  mint: { bg: C.mintSoft,  title: C.mintInk,  body: '#237A5C' },
  gold: { bg: C.goldSoft,  title: C.goldInk,  body: '#8A6410' },
  ind:  { bg: C.indSoft,   title: C.indInk,   body: '#4B4384' },
};

function Banner({ variant, icon, title, body }: {
  variant: BannerVariant;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const colors = BANNER_COLORS[variant];
  return (
    <View style={[styles.banner, { backgroundColor: colors.bg }]}>
      <View style={styles.bannerIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.bannerTitle, { color: colors.title }]}>{title}</Text>
        <Text style={[styles.bannerBody, { color: colors.body }]}>{body}</Text>
      </View>
    </View>
  );
}

// ─── StepTracker ──────────────────────────────────────────────────────────────
// Rows arrive already ordered by src/lib/proposalSteps: completed approvals
// first, in the sequence they happened, then whatever is still outstanding.

function StepTracker({ flow }: { flow: ProposalFlow }) {
  const { steps, terminal, doneCount, total } = flow;
  const activeIdx = steps.findIndex(s => s.state === 'current');
  const remaining = total - doneCount - (activeIdx >= 0 ? 1 : 0);
  const stepNum = Math.min(doneCount + 1, total);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.stepsHeader}>
        <Text style={styles.stepsTitle}>Proposal status</Text>
        <Text style={styles.stepsCounter}>
          {terminal
            ? terminal === 'declined' ? 'Not taken forward' : 'Withdrawn'
            : `Step ${stepNum} of ${total}`}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        {(doneCount > 0 || activeIdx >= 0) && (
          <LinearGradient
            colors={['#3D7A6B', C.indInk]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressSegment, { flex: doneCount + (activeIdx >= 0 ? 1 : 0) }]}
          />
        )}
        {remaining > 0 && (
          <View style={[styles.progressSegment, { flex: remaining, backgroundColor: '#D9D4C8' }]} />
        )}
      </View>

      {/* Steps */}
      <View style={styles.stepsWrap}>
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <View key={i} style={styles.stepRow}>
              {/* Left column: dot + connecting line */}
              <View style={styles.stepLeft}>
                {step.state === 'current' ? (
                  <View style={styles.dotHaloWrap}>
                    <View style={[styles.stepDot, styles.dotNext]}>
                      <Text style={[styles.dotNum, styles.dotNumActive]}>{step.order}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.stepDot, step.state === 'done' ? styles.dotDone : styles.dotWait]}>
                    {step.state === 'done' ? (
                      <Text style={styles.dotCheck}>✓</Text>
                    ) : (
                      <Text style={styles.dotNum}>{step.order}</Text>
                    )}
                  </View>
                )}
                {!isLast && (
                  <View style={[
                    styles.stepLine,
                    step.state === 'done' ? styles.stepLineDone : styles.stepLineWait,
                  ]} />
                )}
              </View>

              {/* Right column: content */}
              <View style={[styles.stepContent, { paddingTop: step.state === 'current' ? 17 : 10 }]}>
                <Text style={[
                  styles.stepLabel,
                  step.state === 'waiting' && styles.stepLabelWait,
                ]}>
                  {step.label}
                </Text>
                {!!step.sub ? (
                  <Text style={styles.stepSub}>{step.sub}</Text>
                ) : step.state === 'waiting' ? (
                  <Text style={styles.stepSub}>Not started</Text>
                ) : null}
                {step.state === 'current' && (
                  <View style={styles.inProgressBadge}>
                    <ClockIcon color={C.indInk} />
                    <Text style={styles.inProgressText}>In progress</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── ProfileMiniCard ──────────────────────────────────────────────────────────
function ProfileMiniCard({
  who, sub, chipLabel, chipBg, chipColor, children,
}: {
  who: string;
  sub: string | null;
  chipLabel: string | null;
  chipBg: string;
  chipColor: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={[styles.prow, { paddingBottom: 0 }]}>
        <View style={styles.ptop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pwho}>{who}</Text>
            {!!sub && <Text style={styles.pwhos}>{sub}</Text>}
          </View>
          {!!chipLabel && (
            <View style={[styles.chip, { backgroundColor: chipBg }]}>
              <Text style={[styles.chipText, { color: chipColor }]}>{chipLabel}</Text>
            </View>
          )}
        </View>
      </View>
      {children}
    </View>
  );
}

// ─── InfoRows ─────────────────────────────────────────────────────────────────
function InfoRows({ rows }: { rows: [string, string | null | undefined][] }) {
  const visible = rows.filter(([, v]) => v != null && v !== '');
  if (visible.length === 0) return null;
  return (
    <View style={styles.rowsWrap}>
      {visible.map(([label, value], i) => (
        <View key={label} style={[styles.infoRow, i === 0 && styles.infoRowFirst]}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── LockNotice ───────────────────────────────────────────────────────────────
function LockNotice({ text }: { text: string }) {
  return (
    <View style={styles.lockWrap}>
      <View style={styles.lockIcon}><LockIcon /></View>
      <Text style={styles.lockText}>{text}</Text>
    </View>
  );
}

// ─── ActionButtons ────────────────────────────────────────────────────────────
type BtnVariant = 'g' | 'f' | 'o' | 'd';

const BTN_STYLES: Record<BtnVariant, { bg: string; color: string; border?: string }> = {
  g: { bg: '#F2F1F7',  color: C.ink2 },
  f: { bg: C.rose,     color: '#fff' },
  o: { bg: '#fff',     color: C.indInk, border: C.indSoft },
  d: { bg: C.indInk,   color: '#fff' },
};

function ActionButtons({ buttons }: { buttons: [BtnVariant, string, (() => void)?][] }) {
  const single = buttons.length === 1;
  return (
    <View style={[styles.acts, single && styles.actsSingle]}>
      {buttons.map(([variant, label, onPress], i) => {
        const s = BTN_STYLES[variant];
        return (
          <Pressable
            key={i}
            onPress={onPress}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: s.bg, borderWidth: s.border ? 1.5 : 0, borderColor: s.border ?? 'transparent' },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}>
            <Text style={[styles.btnText, { color: s.color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Stage helpers ────────────────────────────────────────────────────────────
// The step flow itself now lives in src/lib/proposalSteps, which knows all four
// viewpoints. The three builders that used to sit here were keyed on a stage
// vocabulary the server no longer sends, so each one fell through to its default.

/**
 * What withdrawing costs at this point, in the reader's terms.
 *
 * `waliSent` matters only before the proposal leaves the sending side: a wali
 * who sent it himself has no separate approval of his own still to come.
 */
function lockText(
  stage: ProposalStage,
  viewer: 'suitor' | 'suitorWali',
  waliSent: boolean,
): string {
  switch (stage) {
    case 'HIS_WALI_PENDING':
      if (waliSent) {
        return 'Withdrawing now is silent — her family will not be told you proposed.';
      }
      return viewer === 'suitorWali'
        ? 'Withdrawing now is silent — the other family will not be notified.'
        : 'Withdrawing now is silent — your wali will not be asked to review this.';
    case 'HER_WALI_REVIEWING':
      return viewer === 'suitorWali'
        ? 'Withdrawing now is silent — her family will not be told you approved.'
        : 'Withdrawing now is silent — her family will not be told your wali approved.';
    case 'HER_DECISION_PENDING':
      return 'Both walis approved. Withdrawing is still silent — she will not be told.';
    case 'ACCEPTED':
      return 'She has accepted. A chat with both walis is now open.';
    case 'DECLINED':
      return 'This proposal was not taken forward.';
    case 'WITHDRAWN':
      return 'This proposal was withdrawn.';
  }
}


function SentProposalDetail({
  proposal, onBack, onWithdrawSuccess, onViewProfile, isWaliView, waliIsSender, wardName,
}: {
  proposal: SentProposal;
  onBack: () => void;
  onWithdrawSuccess?: () => void;
  onViewProfile?: (userId: string, type: 'sent' | 'received', matchId: string | null) => void;
  isWaliView?: boolean;
  waliIsSender?: boolean;
  wardName?: string;
}) {
  const insets = useSafeAreaInsets();
  const [withdrawing, setWithdrawing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const stage = proposal.stage;
  const matched = stage === 'ACCEPTED';

  async function confirmWithdraw() {
    setWithdrawing(true);
    try {
      if (isWaliView) {
        await withdrawWardProposal(proposal.userId);
      } else {
        await withdrawProposal(proposal.userId);
      }
      setShowConfirm(false);
      onWithdrawSuccess?.();
      onBack();
    } catch {
      setWithdrawing(false);
      setShowConfirm(false);
    }
  }

  const who = [proposal.age, proposal.city].filter(Boolean).join(' · ');
  const sub = fmtSect(proposal.sect, proposal.madhhab);

  // Derived from the proposal, not just the prop: neither caller passes
  // `waliIsSender`, so keying on it alone left every proposal reading as
  // self-sent. The prop stays as an override. Everything that turns on "who
  // sent this" reads this one value — the title and the withdraw copy used to
  // read the raw prop and contradict the tracker right below them.
  const waliSent = (waliIsSender ?? proposal.sentByWali) ?? false;

  // Who is looking, and who sent it — the two things the wording turns on.
  const flow = buildProposalSteps({
    stage,
    viewer: isWaliView ? 'suitorWali' : 'suitor',
    origin: waliSent ? 'wali' : 'self',
    sentAt: proposal.sentAt,
    wardName,
  });

  const educ = fmt(EDUCATION_LABELS, proposal.educationLevel);
  const family = fmt(FAMILY_TYPE_LABELS, proposal.familyType);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <TopBar
        title={waliSent ? 'Your proposal' : isWaliView ? "Ward's proposal" : 'Your proposal'}
        subtitle={who}
        onBack={onBack}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 100, 110) }]}
        showsVerticalScrollIndicator={false}>

        <StepTracker flow={flow} />

        <ProfileMiniCard
          who={who}
          sub={sub}
          chipLabel="Photo shared"
          chipBg={C.mintSoft}
          chipColor={C.mintInk}>
          <InfoRows rows={[
            ['Education',  educ],
            ['Profession', proposal.occupation],
            ['Family',     family],
            ['Her wali',   'Father'],
          ]} />
          <LockNotice text={
            lockText(stage, isWaliView ? 'suitorWali' : 'suitor', waliSent)
          } />
          {matched ? (
            <ActionButtons buttons={[
              ['o', 'View profile', onViewProfile ? () => onViewProfile(proposal.userId, 'sent', proposal.matchId ?? null) : undefined],
            ]} />
          ) : (
            <ActionButtons buttons={[
              ['g', 'Withdraw', () => setShowConfirm(true)],
              ['o', 'View profile', onViewProfile ? () => onViewProfile(proposal.userId, 'sent', proposal.matchId ?? null) : undefined],
            ]} />
          )}
        </ProfileMiniCard>

        <Banner
          variant="gold"
          icon={<ClockIcon color={C.goldInk} />}
          title="Families take their time"
          body="Most reviews take three to seven days. We will notify you either way."
        />

      </ScrollView>

      {/* ── Withdraw confirmation modal ── */}
      <Modal
        transparent
        animationType="fade"
        visible={showConfirm}
        onRequestClose={() => !withdrawing && setShowConfirm(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !withdrawing && setShowConfirm(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Withdraw proposal?</Text>
            <Text style={styles.modalBody}>
              This is silent — she will not be told. You can propose again in the future.
            </Text>
            <View style={styles.modalRow}>
              <Pressable
                style={styles.modalBtnCancel}
                onPress={() => setShowConfirm(false)}
                disabled={withdrawing}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtnWithdraw, withdrawing && { opacity: 0.6 }]}
                onPress={confirmWithdraw}
                disabled={withdrawing}>
                <Text style={styles.modalBtnWithdrawText}>
                  {withdrawing ? 'Withdrawing…' : 'Withdraw'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}

// ─── PR7: Received proposal detail ────────────────────────────────────────────
function ReceivedProposalDetail({
  proposal, onBack, onAccept, onDecline, isWaliView = false, wardName,
}: {
  proposal: ReceivedProposal;
  onBack: () => void;
  onAccept?: (userId: string) => void;
  onDecline?: (userId: string) => void;
  /** True when her wali is the one reading it. */
  isWaliView?: boolean;
  wardName?: string;
}) {
  const insets = useSafeAreaInsets();

  const who = [proposal.age, proposal.city].filter(Boolean).join(' · ');
  const sub = fmtSect(proposal.sect, proposal.madhhab);
  const matched = proposal.status === 'matched';

  const educ = fmt(EDUCATION_LABELS, proposal.educationLevel);
  const marital = fmt(MARITAL_LABELS, proposal.maritalStatus);
  const family = fmt(FAMILY_TYPE_LABELS, proposal.familyType);
  const height = formatHeight(proposal.heightCm);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <TopBar title="Proposal received" subtitle={who} onBack={onBack} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 100, 110) }]}
        showsVerticalScrollIndicator={false}>

        <StepTracker flow={buildProposalSteps({
          stage: proposal.stage,
          viewer: isWaliView ? 'recipientWali' : 'recipient',
          origin: proposal.sentByWali ? 'wali' : 'self',
          sentAt: proposal.sentAt,
          wardName,
        })} />

        <Banner
          variant="ind"
          icon={<FamilyIcon color={C.indInk} />}
          title="His wali has already approved"
          body="His wali reviewed this before it reached you."
        />

        <ProfileMiniCard
          who={who}
          sub={sub}
          chipLabel={proposal.idVerified ? 'ID verified' : null}
          chipBg={C.mintSoft}
          chipColor={C.mintInk}>
          <InfoRows rows={[
            ['Education',      educ],
            ['Profession',     proposal.occupation],
            ['Height',         height],
            ['Marital status', marital],
            ['Family',         family],
            ['His wali',       'Father'],
          ]} />
        </ProfileMiniCard>

        {/* Action card with lock + buttons */}
        <View style={styles.card}>
          <LockNotice text="Declining is silent. He is told only that it was not taken forward, and he cannot propose to you again for 90 days." />
          {!matched && (
            <ActionButtons buttons={[
              ['g', 'Decline', onDecline ? () => onDecline(proposal.userId) : undefined],
              ['f', 'Accept',  onAccept  ? () => onAccept(proposal.userId)  : undefined],
            ]} />
          )}
          {matched && (
            <ActionButtons buttons={[
              ['f', 'Open chat'],
            ]} />
          )}
        </View>

      </ScrollView>
    </View>
  );
}

// ─── exports ──────────────────────────────────────────────────────────────────
export type ProposalDetailSelection =
  | { type: 'sent';     proposal: SentProposal }
  | { type: 'received'; proposal: ReceivedProposal };

interface ProposalDetailScreenProps {
  selected: ProposalDetailSelection;
  onBack: () => void;
  onWithdrawSuccess?: () => void;
  onViewProfile?: (userId: string, type: 'sent' | 'received', matchId: string | null) => void;
  onAccept?: (userId: string) => void;
  onDecline?: (userId: string) => void;
  isWaliView?: boolean;
  waliIsSender?: boolean;
  wardName?: string;
}

export function ProposalDetailScreen({ selected, onBack, onWithdrawSuccess, onViewProfile, onAccept, onDecline, isWaliView, waliIsSender, wardName }: ProposalDetailScreenProps) {
  if (selected.type === 'sent') {
    return (
      <SentProposalDetail
        proposal={selected.proposal}
        onBack={onBack}
        onWithdrawSuccess={onWithdrawSuccess}
        onViewProfile={onViewProfile}
        isWaliView={isWaliView}
        waliIsSender={waliIsSender}
        wardName={wardName}
      />
    );
  }
  return (
    <ReceivedProposalDetail
      proposal={selected.proposal}
      onBack={onBack}
      onAccept={onAccept}
      onDecline={onDecline}
      isWaliView={isWaliView}
      wardName={wardName}
    />
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.page,
  },

  // ── TopBar ──────────────────────────────────────────────────────────────────
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
  topBarSub: {
    fontSize: 11.5,
    color: C.ink3,
    marginTop: 1,
  },

  // ── Scroll ──────────────────────────────────────────────────────────────────
  scroll: {
    paddingHorizontal: 15,
    paddingTop: 4,
    gap: 0,
  },

  // ── Card ────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    shadowColor: 'rgba(40,30,80,0.055)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 2,
    marginBottom: 13,
    overflow: 'hidden',
  },

  // ── Banner ──────────────────────────────────────────────────────────────────
  banner: {
    borderRadius: 18,
    padding: 13,
    paddingHorizontal: 14,
    marginBottom: 13,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  bannerIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  bannerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  bannerBody: {
    fontSize: 12,
    lineHeight: 18.6,
  },

  // ── Steps ───────────────────────────────────────────────────────────────────
  stepsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: '#1A1A2E',
  },
  stepsCounter: {
    fontSize: 13,
    color: C.ink3,
  },
  progressTrack: {
    height: 5,
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 22,
  },
  progressSegment: {
    // flex set inline
  },
  stepsWrap: {
    paddingBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepLeft: {
    width: 70,
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'column',
  },
  stepDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dotDone: { backgroundColor: '#3D7A6B' },
  dotNext: { backgroundColor: C.indInk },
  dotWait: { backgroundColor: '#D5D0C4' },
  dotHaloWrap: {
    borderRadius: 28,
    borderWidth: 7,
    borderColor: 'rgba(51, 44, 102, 0.15)',
  },
  dotCheck: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  dotNum: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B0ACA0',
  },
  dotNumActive: {
    color: '#fff',
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 16,
  },
  stepLineDone: { backgroundColor: '#3D7A6B' },
  stepLineWait: { backgroundColor: '#D5D0C4' },
  stepContent: {
    flex: 1,
    paddingRight: 18,
    paddingBottom: 22,
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
    lineHeight: 22,
  },
  stepLabelWait: {
    color: C.ink3,
    fontWeight: '400',
  },
  stepSub: {
    fontSize: 13,
    color: C.ink3,
    marginTop: 2,
    lineHeight: 19,
  },
  inProgressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.indSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  inProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.indInk,
  },

  // ── Profile mini card ────────────────────────────────────────────────────────
  prow: {
    padding: 16,
    paddingHorizontal: 18,
  },
  ptop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 9,
  },
  pwho: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: C.ink,
  },
  pwhos: {
    fontSize: 12.5,
    color: C.ink2,
    marginTop: 2,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    flexShrink: 0,
  },
  chipText: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  // ── Info rows ────────────────────────────────────────────────────────────────
  rowsWrap: {
    paddingHorizontal: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: C.line,
    gap: 10,
  },
  infoRowFirst: {
    borderTopWidth: 0,
  },
  infoLabel: {
    fontSize: 13.5,
    color: C.ink3,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    color: C.ink,
  },

  // ── Lock notice ──────────────────────────────────────────────────────────────
  lockWrap: {
    margin: 13,
    marginTop: 13,
    backgroundColor: '#F7F6FB',
    borderRadius: 15,
    padding: 12,
    paddingHorizontal: 13,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'flex-start',
  },
  lockIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  lockText: {
    fontSize: 12,
    color: C.ink2,
    lineHeight: 18.6,
    flex: 1,
  },

  // ── Action buttons ───────────────────────────────────────────────────────────
  acts: {
    flexDirection: 'row',
    gap: 9,
    padding: 15,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  actsSingle: {
    flexDirection: 'column',
  },
  btn: {
    flex: 1,
    height: 47,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 14.5,
    fontWeight: '700',
  },

  // ── Withdraw modal ───────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,8,28,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#17171F',
    marginBottom: 10,
  },
  modalBody: {
    fontSize: 14.5,
    color: '#5F5E70',
    lineHeight: 21,
    marginBottom: 24,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtnCancel: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#E4E2ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancelText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#5F5E70',
  },
  modalBtnWithdraw: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    backgroundColor: '#E6396E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnWithdrawText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
