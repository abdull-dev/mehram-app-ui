/**
 * ProposalsScreen — PR3, PR4, PR5
 *
 * PR3: Proposals tab, Sent segment
 * PR4: Proposals tab, Received segment
 * PR5: Empty state
 *
 * Tapping a row navigates to PR6 (sent detail) or PR7 (received detail)
 * via ProposalDetailScreen.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MADHHAB_LABELS, SECT_LABELS, labelFor } from '../../utils/enumLabels';
import Svg, { Path, Rect } from 'react-native-svg';
import { getProposals, getReceivedProposals } from '../../api/proposals';
import type { ProposalStage, ReceivedProposal, SentProposal } from '../../api/proposals';
import type { ProposalDetailSelection } from './ProposalDetailScreen';
import { Bone } from '../../components/ui/Skeleton';
import { FadeInUp, PressableScale } from '../../components/ui/Motion';
import { useProposalsRealtime } from '../../hooks/useProposalsRealtime';
import { formatHeight } from '../../utils/height';
import { buildProposalSteps, pronounsFor, isResolvedStage } from '../../lib/proposalSteps';

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
  mintBody:  '#237A5C',
  goldSoft:  '#FBF2DE',
  goldInk:   '#7A5709',
  greySoft:  '#F1F0F6',
  greyInk:   '#6E6B80',
  page:      '#F6F5FA',
  ink:       '#17171F',
  ink2:      '#5F5E70',
  ink3:      '#9695A5',
  progBg:    '#EDECF3',
  progEmpty: '#E4E2ED',
  segBg:     '#EDEBF4',
  emptyIcon: '#EFEDF6',
} as const;

// ─── types ────────────────────────────────────────────────────────────────────
type ChipVariant = 'gold' | 'mint' | 'rose' | 'grey' | 'ind';

interface ProposalCard {
  name: string;
  details: string;   // age · city · height
  sub: string;       // sect · occupation
  meta: string;      // "Sent today"
  chipVariant: ChipVariant;
  chipLabel: string;
  doneSteps: number;
  /** Approvals this proposal needs — fewer when a side has no wali. */
  totalSteps: number;
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmtSect(sect?: string | null, madhhab?: string | null): string | null {
  const s = labelFor(SECT_LABELS, sect);
  const m = labelFor(MADHHAB_LABELS, madhhab);
  if (s && m) return `${s} (${m})`;
  return s;
}

function fmtSentAt(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'Sent today';
  if (days === 1) return 'Sent yesterday';
  if (days < 7) return `Sent ${new Date(iso).toLocaleDateString('en-US', { weekday: 'long' })}`;
  if (days < 14) return 'Sent last week';
  return `Sent ${Math.floor(days / 7)} weeks ago`;
}

function fmtReceivedAt(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'Received today';
  if (days === 1) return 'Received yesterday';
  if (days < 7) return `Received ${new Date(iso).toLocaleDateString('en-US', { weekday: 'long' })}`;
  if (days < 14) return 'Received last week';
  return `Received ${Math.floor(days / 7)} weeks ago`;
}

// Stage → progress bar segments done (0-4) and chip
// The fallback for when the server sends no stageLabel. Gendered words follow
// the counterpart rather than assuming the suitor is a man.
const sentStageMap = (
  gender?: string | null,
): Record<ProposalStage, { chipVariant: ChipVariant; chipLabel: string }> => {
  const p = pronounsFor(gender);
  return {
    HIS_WALI_PENDING:     { chipVariant: 'gold', chipLabel: 'Awaiting your wali' },
    HER_WALI_REVIEWING:   { chipVariant: 'gold', chipLabel: `With ${p.possessive} wali` },
    HER_DECISION_PENDING: { chipVariant: 'gold', chipLabel: `Awaiting ${p.possessive} answer` },
    ACCEPTED:             { chipVariant: 'mint', chipLabel: `${p.Subject} accepted` },
    DECLINED:             { chipVariant: 'ind',  chipLabel: 'Not taken forward' },
    WITHDRAWN:            { chipVariant: 'ind',  chipLabel: 'Withdrawn' },
  };
};

const receivedStageMap = (
  gender?: string | null,
): Record<ProposalStage, { chipVariant: ChipVariant; chipLabel: string }> => {
  const p = pronounsFor(gender);
  return {
    HIS_WALI_PENDING:     { chipVariant: 'ind',  chipLabel: `With ${p.possessive} wali` },
    HER_WALI_REVIEWING:   { chipVariant: 'ind',  chipLabel: 'With your wali' },
    HER_DECISION_PENDING: { chipVariant: 'rose', chipLabel: 'Needs your answer' },
    ACCEPTED:             { chipVariant: 'mint', chipLabel: 'Accepted' },
    DECLINED:             { chipVariant: 'ind',  chipLabel: 'Not taken forward' },
    WITHDRAWN:            { chipVariant: 'ind',  chipLabel: 'Withdrawn' },
  };
};

function toSentCard(p: SentProposal): ProposalCard {
  const sectStr = fmtSect(p.sect, p.madhhab);
  const { chipVariant, chipLabel } = sentStageMap(p.gender)[p.stage];
  // Origin matters even for a bare count: a wali-sent proposal has two
  // approvals in hand at send time, not one.
  const { doneCount: doneSteps, total: totalSteps } = buildProposalSteps({
    stage: p.stage,
    viewer: 'suitor',
    origin: p.sentByWali ? 'wali' : 'self',
    suitorHasWali: p.suitorHasWali,
    recipientHasWali: p.recipientHasWali,
    counterpartGender: p.gender,
  });
  return {
    name: p.fullName ?? 'Unknown',
    details: [p.age, p.city, formatHeight(p.heightCm)].filter(Boolean).join(' · '),
    sub: [sectStr, p.occupation].filter(Boolean).join(' · '),
    meta: fmtSentAt(p.sentAt),
    chipVariant,
    chipLabel: p.stageLabel ?? chipLabel,
    doneSteps,
    totalSteps,
  };
}

function toReceivedCard(p: ReceivedProposal): ProposalCard {
  const sectStr = fmtSect(p.sect, p.madhhab);
  const { chipVariant, chipLabel } = receivedStageMap(p.gender)[p.stage];
  const { doneCount: doneSteps, total: totalSteps } = buildProposalSteps({
    stage: p.stage,
    viewer: 'recipient',
    origin: p.sentByWali ? 'wali' : 'self',
    suitorHasWali: p.suitorHasWali,
    recipientHasWali: p.recipientHasWali,
    counterpartGender: p.gender,
  });
  /**
   * Once it is accepted, when it arrived stops being the useful fact — who
   * agreed is. The full sentence goes here rather than in the chip, which
   * cannot shrink and would squeeze the name out of the row.
   *
   * Only claims families where families actually acted: with no guardian on
   * either side this was two people agreeing, and saying otherwise would
   * credit an approval nobody gave.
   */
  const accepted = p.stage === 'ACCEPTED';
  const bothFamilies = p.suitorHasWali === true && p.recipientHasWali === true;
  const meta = accepted
    ? bothFamilies
      ? 'Accepted by both families'
      : 'Accepted by you both'
    : fmtReceivedAt(p.sentAt);

  return {
    name: p.fullName ?? 'Unknown',
    details: [p.age, p.city, formatHeight(p.heightCm)].filter(Boolean).join(' · '),
    sub: [sectStr, p.occupation].filter(Boolean).join(' · '),
    meta,
    chipVariant,
    chipLabel,
    doneSteps,
    totalSteps,
  };
}

// ─── icons ────────────────────────────────────────────────────────────────────
function ShieldCheckIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"
      stroke={C.mintInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 22s8-4 8-10V5.5L12 2.5 4 5.5V12c0 6 8 10 8 10z" />
      <Path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

function EnvelopeIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none"
      stroke="#8C86A8" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={14} rx={3} />
      <Path d="M3.5 7.5l8.5 6 8.5-6" />
    </Svg>
  );
}

// ─── chip ─────────────────────────────────────────────────────────────────────
const CHIP_COLORS: Record<ChipVariant, { bg: string; color: string }> = {
  gold: { bg: C.goldSoft, color: C.goldInk },
  mint: { bg: C.mintSoft, color: C.mintInk },
  rose: { bg: C.roseSoft, color: C.roseInk },
  grey: { bg: C.greySoft, color: C.greyInk },
  ind:  { bg: C.indSoft,  color: C.indInk  },
};

function Chip({ variant, label }: { variant: ChipVariant; label: string }) {
  const { bg, color } = CHIP_COLORS[variant];
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({
  doneSteps,
  totalSteps,
}: {
  doneSteps: number;
  totalSteps: number;
}) {
  // One segment per approval this proposal actually needs. Fixed at four, a
  // proposal between two people with no wali showed three of them filled —
  // crediting two reviews that were never going to happen.
  //
  // Colours: done is mint, waiting is grey, and the step in progress is indigo.
  // It used to be rose, which is this screen's colour for actions and for the
  // "Withdraw" button — so a proposal moving along normally was marked in the
  // same red as something needing attention. `ProposalDetailScreen` already
  // draws the current step's dot in `indInk`, so the list and the detail view of
  // the same proposal now agree.
  return (
    <View style={styles.progBar}>
      {Array.from({ length: totalSteps }, (_, i) => {
        const bg =
          i < doneSteps ? C.mint
          : i === doneSteps && doneSteps < totalSteps ? C.indInk
          : C.progEmpty;
        return <View key={i} style={[styles.progSeg, { backgroundColor: bg }]} />;
      })}
    </View>
  );
}

/**
 * Stands in for `ProposalRow` while the list loads.
 *
 * Deliberately the same shape as the real card — name, details, sub, meta, chip
 * and the segmented progress bar — so the list does not reflow when the data
 * arrives. A centred spinner told the user nothing about what was coming.
 */
function ProposalRowSkeleton({ steps }: { steps: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.prow}>
        <View style={styles.ptop}>
          <View style={styles.ptopLeft}>
            <Bone w={148} h={17} radius={7} />
            <Bone w={112} h={13} radius={6} style={{ marginTop: 5 }} />
            <Bone w={92} h={12} radius={6} style={{ marginTop: 4 }} />
            <Bone w={72} h={11} radius={5} style={{ marginTop: 7 }} />
          </View>
          <Bone w={74} h={21} radius={8} />
        </View>
        <View style={styles.progBar}>
          {Array.from({ length: steps }, (_, i) => (
            <View key={i} style={[styles.progSeg, { backgroundColor: C.progEmpty }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── proposal card ────────────────────────────────────────────────────────────
function ProposalRow({ card, onPress, index = 0 }: {
  card: ProposalCard;
  onPress: () => void;
  /** Position in the list, for the staggered entrance. */
  index?: number;
}) {
  return (
    <FadeInUp index={index}>
      {/* Scale rather than the previous opacity dip: fading a card reads as
          disabling it, while a small scale reads as pressing it. */}
      <PressableScale onPress={onPress} style={styles.card}>
      <View style={styles.prow}>
        <View style={styles.ptop}>
          <View style={styles.ptopLeft}>
            <Text style={styles.pwho}>{card.name}</Text>
            {!!card.details && <Text style={styles.pdetails}>{card.details}</Text>}
            {!!card.sub && <Text style={styles.pwhos}>{card.sub}</Text>}
            <Text style={styles.pmeta}>{card.meta}</Text>
          </View>
          <Chip variant={card.chipVariant} label={card.chipLabel} />
        </View>
        <ProgressBar doneSteps={card.doneSteps} totalSteps={card.totalSteps} />
      </View>
      </PressableScale>
    </FadeInUp>
  );
}

// ─── mint banner (PR4) ────────────────────────────────────────────────────────
function MintBanner() {
  return (
    <View style={styles.banner}>
      <ShieldCheckIcon />
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerTitle}>Reading and declining is free</Text>
        <Text style={styles.bannerBody}>You only need a membership to accept.</Text>
      </View>
    </View>
  );
}

// ─── empty state (PR5) ────────────────────────────────────────────────────────
function EmptyState({ onSeeIntroduction }: { onSeeIntroduction?: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIcon}>
          <EnvelopeIcon />
        </View>
        <Text style={styles.emptyTitle}>No proposals yet</Text>
        <Text style={styles.emptyBody}>
          When you propose to someone, it goes to your wali, then to her family.
          You will see every stage here.
        </Text>
      </View>
      <View style={styles.acts}>
        <Pressable
          onPress={onSeeIntroduction}
          style={({ pressed }) => [
            styles.btnFilled,
            { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}>
          <Text style={styles.btnFilledText}>{"See today\u2019s introduction"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── module-level cache — survives component unmount/remount (e.g. navigating to Chats and back) ──
let _cachedSent: SentProposal[] = [];
let _cachedReceived: ReceivedProposal[] = [];
let _loaded = false;

/**
 * Drop the cache on sign-out.
 *
 * It is module-level, so it outlives the whole component tree: without this a
 * second account signing in on the same device saw the previous user's
 * proposals until the first fetch returned.
 */
export function resetProposalsCache(): void {
  _cachedSent = [];
  _cachedReceived = [];
  _loaded = false;
}

// ─── props ────────────────────────────────────────────────────────────────────
interface ProposalsScreenProps {
  onSeeIntroduction?: () => void;
  onSelectProposal?: (sel: ProposalDetailSelection) => void;
  /** Increment to trigger an immediate silent refresh (e.g. after sendProposal) */
  refreshKey?: number;
  /**
   * The signed-in user's id, used for the realtime subscription.
   *
   * `useProposalsRealtime` takes (userId, onStale); it was called with the
   * loader alone, so the loader *became* the user id and the screen
   * subscribed to a channel named after a function — one nothing has ever
   * broadcast to. That is why proposals only moved on a manual reload.
   */
  userId?: string;
  /** Opens the photo-requests queue from the header. */
  onPhotoRequests?: () => void;
  /**
   * Photo requests waiting on this user.
   *
   * The nav badge sums proposals and photo requests, so a count with no
   * proposals behind it left the user staring at an empty list wondering what
   * the number meant. Shown on the link that leads to it.
   */
  photoRequestsBadge?: number;
  /** Called after every load with the current received proposals count — used for badge */
  onReceivedCountChange?: (count: number) => void;
}

/**
 * How many received proposals still want the user — answered, declined and
 * withdrawn ones do not.
 *
 * Shared by the bottom-nav badge and the "Received" tab label so the two
 * cannot disagree about what the number means.
 */
function countUnresolved(list: ReceivedProposal[]): number {
  return list.filter(r => !isResolvedStage(r.stage)).length;
}

// ─── component ────────────────────────────────────────────────────────────────
export function ProposalsScreen({ onSeeIntroduction, onSelectProposal, refreshKey, userId, onPhotoRequests, photoRequestsBadge = 0, onReceivedCountChange }: ProposalsScreenProps) {
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState<'sent' | 'received'>('sent');
  const [sentList, setSentList] = useState<SentProposal[]>(_cachedSent);
  const [receivedList, setReceivedList] = useState<ReceivedProposal[]>(_cachedReceived);
  // Skip spinner on remount if we already have cached data
  const [loading, setLoading] = useState(!_loaded);
  const [refreshing, setRefreshing] = useState(false);

  // Keep callback stable via ref so load() doesn't need it as a dep
  const onReceivedCountChangeRef = useRef(onReceivedCountChange);
  useEffect(() => { onReceivedCountChangeRef.current = onReceivedCountChange; }, [onReceivedCountChange]);

  const load = useCallback(async () => {
    try {
      const [sent, received] = await Promise.all([
        getProposals(),
        getReceivedProposals(),
      ]);
      _cachedSent = sent;
      _cachedReceived = received;
      _loaded = true;
      setSentList(sent);
      setReceivedList(received);
      // The badge means "these want you", not "these exist": an answered
      // proposal kept the count lit with nothing left to act on.
      onReceivedCountChangeRef.current?.(countUnresolved(received));
    } catch {
      // keep existing data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load — on remount after Chats navigation, runs silently (no spinner)
  useEffect(() => { load(); }, [load]);

  // Refresh when parent increments refreshKey (e.g. right after sendProposal)
  const prevRefreshKeyRef = useRef(refreshKey);
  useEffect(() => {
    if (refreshKey === prevRefreshKeyRef.current) return;
    prevRefreshKeyRef.current = refreshKey;
    load();
  }, [refreshKey, load]);

  // Live updates over Supabase Realtime — the server broadcasts
  // 'proposals:stale' on every stage change, so no polling is needed.
  useProposalsRealtime(userId ?? '', load);

  const receivedPending = useMemo(() => countUnresolved(receivedList), [receivedList]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const isEmpty = sentList.length === 0 && receivedList.length === 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top + 8, 20),
            paddingBottom: Math.max(insets.bottom + 100, 110),
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.rose} />
        }>

        <View style={styles.tabhdr}>
          <Text style={styles.tabhdrTitle}>Proposals</Text>
          {/* Photo requests are a separate queue with its own answers, so they
              get their own screen rather than a third segment here. */}
          {!!onPhotoRequests && (
            <Pressable
              onPress={onPhotoRequests}
              hitSlop={8}
              accessibilityRole="button"
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
              <View style={styles.tabhdrActionRow}>
                <Text style={styles.tabhdrAction}>Photo requests</Text>
                {photoRequestsBadge > 0 && (
                  <View style={styles.tabhdrBadge}>
                    <Text style={styles.tabhdrBadgeText}>
                      {photoRequestsBadge > 99 ? '99+' : photoRequestsBadge}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          )}
        </View>

        <View style={styles.seg}>
          <Pressable
            style={[styles.sgItem, segment === 'sent' && styles.sgItemOn]}
            onPress={() => setSegment('sent')}>
            <Text style={[styles.sgText, segment === 'sent' && styles.sgTextOn]}>
              {`Sent${sentList.length > 0 ? ` (${sentList.length})` : ''}`}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.sgItem, segment === 'received' && styles.sgItemOn]}
            onPress={() => setSegment('received')}>
            <Text style={[styles.sgText, segment === 'received' && styles.sgTextOn]}>
              {/* Counts what still needs an answer, matching the nav badge.
                  The number drops away entirely once everything is resolved —
                  a literal "(0)" would sit beside cards that are still on
                  screen, since the list keeps answered proposals as history. */}
              {`Received${receivedPending > 0 ? ` (${receivedPending})` : ''}`}
            </Text>
          </Pressable>
        </View>

        {loading ? (
          // Three rows: enough to fill the fold without implying a count.
          <>
            <ProposalRowSkeleton steps={4} />
            <ProposalRowSkeleton steps={4} />
            <ProposalRowSkeleton steps={4} />
          </>
        ) : isEmpty ? (
          <EmptyState onSeeIntroduction={onSeeIntroduction} />
        ) : segment === 'received' ? (
          <>
            <MintBanner />
            {receivedList.length > 0
              ? receivedList.map((p, i) => (
                  <ProposalRow
                    key={p.userId}
                    index={i}
                    card={toReceivedCard(p)}
                    onPress={() => onSelectProposal?.({ type: 'received', proposal: p })}
                  />
                ))
              : <Text style={styles.emptyTab}>No received proposals yet.</Text>
            }
          </>
        ) : (
          sentList.length > 0
            ? sentList.map((p, i) => (
                <ProposalRow
                  key={p.userId}
                  index={i}
                  card={toSentCard(p)}
                  onPress={() => onSelectProposal?.({ type: 'sent', proposal: p })}
                />
              ))
            : <EmptyState onSeeIntroduction={onSeeIntroduction} />
        )}
      </ScrollView>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.page },

  scroll: { paddingHorizontal: 15 },

  tabhdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 12,
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  tabhdrActionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabhdrAction: { fontSize: 13, fontWeight: '700', color: C.rose },
  // Matches the nav badge, so the same number reads as the same thing.
  tabhdrBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: C.rose,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabhdrBadgeText: { fontSize: 10.5, fontWeight: '800', color: '#fff' },
  tabhdrTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.6, color: C.ink },

  seg: {
    flexDirection: 'row',
    backgroundColor: C.segBg,
    borderRadius: 14,
    padding: 4,
    marginTop: 12,
    marginBottom: 16,
  },
  sgItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 11 },
  sgItemOn: {
    backgroundColor: '#fff',
    shadowColor: 'rgba(40,30,80,0.08)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  sgText: { fontSize: 13.5, fontWeight: '700', color: C.ink3 },
  sgTextOn: { color: C.rose },

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

  prow: { padding: 16, paddingHorizontal: 18, gap: 11 },
  ptop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 9 },
  ptopLeft: { flex: 1 },
  pwho: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: C.ink },
  pdetails: { fontSize: 13, color: C.ink2, marginTop: 3, fontWeight: '500' },
  pwhos: { fontSize: 12.5, color: C.ink2, marginTop: 2 },
  pmeta: { fontSize: 11.5, color: C.ink3, marginTop: 5 },

  chip: { paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8, flexShrink: 0 },
  chipText: { fontSize: 10.5, fontWeight: '700' },

  progBar: {
    height: 5,
    borderRadius: 4,
    backgroundColor: C.progBg,
    flexDirection: 'row',
    gap: 3,
    overflow: 'hidden',
  },
  progSeg: { flex: 1, borderRadius: 4 },

  banner: {
    backgroundColor: C.mintSoft,
    borderRadius: 18,
    padding: 13,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  bannerTitle: { fontSize: 13.5, fontWeight: '700', color: C.mintInk, marginBottom: 2 },
  bannerBody: { fontSize: 12, lineHeight: 18.6, color: C.mintBody },

  emptyWrap: { alignItems: 'center', paddingTop: 52, paddingHorizontal: 22, paddingBottom: 0 },
  emptyIcon: {
    width: 66, height: 66, borderRadius: 22,
    backgroundColor: C.emptyIcon,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.ink, marginBottom: 6 },
  emptyBody: { fontSize: 13, color: C.ink2, lineHeight: 20.8, textAlign: 'center' },

  acts: { padding: 15, paddingHorizontal: 18, paddingBottom: 18 },
  btnFilled: {
    height: 47, borderRadius: 15, backgroundColor: C.rose,
    alignItems: 'center', justifyContent: 'center',
  },
  btnFilledText: { fontSize: 14.5, fontWeight: '700', color: '#fff' },

  emptyTab: { textAlign: 'center', color: C.ink3, fontSize: 14, marginTop: 32 },
});
