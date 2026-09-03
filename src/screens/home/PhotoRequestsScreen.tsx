/**
 * PhotoRequestsScreen
 *
 * Photo requests, laid out like Proposals: a Sent/Received segment over a list
 * of cards. Reached from the Proposals header.
 *
 *   ┌──────────────────────────────────┐
 *   │  ‹  Photo requests               │
 *   │  [ Sent (1) ][ Received ]        │
 *   │  ┌────────────────────────────┐  │
 *   │  │ Abdullah Tanveer   Waiting │  │
 *   │  │ Asked today                │  │
 *   │  └────────────────────────────┘  │
 *   └──────────────────────────────────┘
 *
 * Received cards carry the two answers; sent cards are status only, because a
 * requester has nothing to do but wait.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  approvePhotoRequest,
  declinePhotoRequest,
  getIncomingPhotoRequests,
  getOutgoingPhotoRequests,
  type IncomingPhotoRequest,
  type OutgoingPhotoRequest,
  type PhotoRequestAnswer,
  type PhotoRequestStatus,
} from '../../api/photoRequests';
import { Bone } from '../../components/ui/Skeleton';
import { FadeInUp } from '../../components/ui/Motion';

const C = {
  rose:      '#E6396E',
  roseInk:   '#A31C48',
  roseSoft:  '#FDECF2',
  indSoft:   '#EEECF8',
  indInk:    '#332C66',
  mintSoft:  '#E5F6F0',
  mintInk:   '#0A5C43',
  goldSoft:  '#FBF2DE',
  goldInk:   '#7A5709',
  greySoft:  '#F1F0F6',
  greyInk:   '#5F5E70',
  segBg:     '#EDECF4',
  page:      '#F6F5FA',
  ink:       '#17171F',
  ink2:      '#5F5E70',
  ink3:      '#9695A5',
};

type ChipVariant = 'gold' | 'mint' | 'rose' | 'grey' | 'ind';

const CHIP: Record<ChipVariant, { bg: string; fg: string }> = {
  gold: { bg: C.goldSoft, fg: C.goldInk },
  mint: { bg: C.mintSoft, fg: C.mintInk },
  rose: { bg: C.roseSoft, fg: C.roseInk },
  grey: { bg: C.greySoft, fg: C.greyInk },
  ind:  { bg: C.indSoft,  fg: C.indInk  },
};

/**
 * How a *sent* request reads back to the person who sent it.
 *
 * DECLINED and REVOKED both say "Not shared". The server deliberately keeps a
 * decline indistinguishable from silence, and naming the refusal here would
 * undo that on the one screen the requester actually reads.
 */
const SENT_STATUS: Record<PhotoRequestStatus, { variant: ChipVariant; label: string }> = {
  PENDING:  { variant: 'gold', label: 'Waiting' },
  APPROVED: { variant: 'mint', label: 'Shared with you' },
  DECLINED: { variant: 'grey', label: 'Not shared' },
  REVOKED:  { variant: 'grey', label: 'Not shared' },
};

function fmtAsked(iso: string, verb: 'Asked' | 'Requested'): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return `${verb} today`;
  if (days === 1) return `${verb} yesterday`;
  if (days < 7) return `${verb} ${new Date(iso).toLocaleDateString('en-US', { weekday: 'long' })}`;
  if (days < 14) return `${verb} last week`;
  return `${verb} ${Math.floor(days / 7)} weeks ago`;
}

/**
 * Fold an approval back into the card that produced it.
 *
 * The row stays in the list, so what changes is its status and whose answer is
 * still outstanding. Under MUTUAL_ACCEPTED one yes leaves the request PENDING,
 * and the approval left is always the *other* party's: the server refuses an
 * approval out of turn, so whoever just answered can never be next.
 */
function applyAnswer(
  r: IncomingPhotoRequest,
  answered: PhotoRequestAnswer,
): IncomingPhotoRequest {
  const settled = answered.status === 'APPROVED';
  return {
    ...r,
    status: answered.status,
    respondedAt: answered.respondedAt,
    waliApprovedAt: answered.waliApprovedAt,
    ownerApprovedAt: answered.ownerApprovedAt,
    waitingOn: settled ? null : r.viewerRole === 'wali' ? 'owner' : 'wali',
    canAnswer: false,
  };
}

/** The chip a received card wears, once its status is allowed to change. */
function receivedChip(r: IncomingPhotoRequest): { variant: ChipVariant; label: string } {
  if (r.status === 'APPROVED') {
    return { variant: 'mint', label: r.viewerRole === 'wali' ? 'Approved' : 'Photos shared' };
  }
  if (r.canAnswer) return { variant: 'rose', label: 'Needs your answer' };
  return {
    variant: 'gold',
    label: r.waitingOn === 'wali' ? 'With your wali' : 'With them',
  };
}

/**
 * Why this request is where it is, in the reader's terms.
 *
 * The mode decides who answers, so the copy has to name that rather than
 * assume the reader is always the decider — under WALI_APPROVED they are told
 * about a decision that is not theirs to make.
 */
function explain(r: IncomingPhotoRequest): string {
  const ward = r.ownerUser.fullName?.split(' ')[0] ?? 'your ward';
  const asker = r.fromUser.fullName?.split(' ')[0] ?? 'They';

  if (r.status === 'APPROVED') {
    return r.viewerRole === 'wali'
      ? `Approved. ${asker} and ${ward} can see each other's photos now, and you can withdraw it for ${ward} at any time.`
      : `Shared. ${asker} can see your photos now, and you can withdraw that at any time in Privacy and photos.`;
  }

  // Half-answered: your stamp is in, and the request is waiting on the other
  // party. Saying so is the point of keeping the card here.
  if (r.viewerRole === 'wali' && r.waliApprovedAt) {
    return `You approved this for ${ward}. Nothing is shared until ${ward} answers it themselves.`;
  }

  if (r.viewerRole === 'wali') {
    return r.canAnswer
      ? `${ward} has asked you to decide photo requests on their behalf. Declining is silent — the other family is not told.`
      : `${ward} answers this one themselves. You can still decline it for them.`;
  }

  if (r.canAnswer) {
    return r.waliApprovedAt
      ? 'Your wali has approved this. It is now your decision — sharing lets them see your photos, and declining is silent.'
      : 'Sharing lets them see your photos. Declining is silent — they are not told either way.';
  }

  return r.waitingOn === 'wali'
    ? 'Your wali is asked first. You will be able to decide once they have approved it.'
    : 'Your wali decides this on your behalf. You are told each time.';
}

function BackIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={C.indInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function Chip({ variant, label }: { variant: ChipVariant; label: string }) {
  const c = CHIP[variant];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Text style={[styles.chipText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

/**
 * Stands in for a photo-request card: name, timestamp, status chip.
 *
 * The received variant also carries a note and two buttons, but the skeleton
 * shows the common shape only — guessing which variant is coming would make the
 * list jump when the answer differs.
 */
function PhotoRequestSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.rowTop}>
        <View style={styles.rowLeft}>
          <Bone w={142} h={17} radius={7} />
          <Bone w={86} h={11} radius={5} style={{ marginTop: 7 }} />
        </View>
        <Bone w={70} h={21} radius={8} />
      </View>
    </View>
  );
}

interface PhotoRequestsScreenProps {
  onBack?: () => void;
  /** Opens Privacy and photos, where the answering rule is set. */
  onOpenPrivacy?: () => void;
}

export function PhotoRequestsScreen({ onBack, onOpenPrivacy }: PhotoRequestsScreenProps) {
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState<'sent' | 'received'>('sent');
  const [sent, setSent] = useState<OutgoingPhotoRequest[]>([]);
  const [received, setReceived] = useState<IncomingPhotoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [answering, setAnswering] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [out, inc] = await Promise.all([
        getOutgoingPhotoRequests().catch(() => [] as OutgoingPhotoRequest[]),
        getIncomingPhotoRequests().catch(() => [] as IncomingPhotoRequest[]),
      ]);
      setSent(out);
      setReceived(inc);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = (id: string) => async () => {
    if (answering) return;
    setAnswering(id);
    setError(null);
    try {
      const answered = await approvePhotoRequest(id);
      // The card stays: an approval is something the reader should see land on
      // the request they answered, not a row that vanishes under their thumb.
      setReceived(prev => prev.map(r => (r.id === id ? applyAnswer(r, answered) : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your answer. Please try again.');
    } finally {
      setAnswering(null);
    }
  };

  const decline = (id: string) => async () => {
    if (answering) return;
    setAnswering(id);
    setError(null);
    try {
      await declinePhotoRequest(id);
      // A decline is silent and final, and the server drops it from the queue
      // — so the row goes with it rather than sitting here as a refusal.
      setReceived(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your answer. Please try again.');
    } finally {
      setAnswering(null);
    }
  };

  const list = segment === 'sent' ? sent : received;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top + 8, 20),
            paddingBottom: Math.max(insets.bottom + 24, 40),
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={C.rose}
          />
        }>

        <View style={styles.hdr}>
          <Pressable
            onPress={onBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.65 }]}>
            <BackIcon />
          </Pressable>
          <Text style={styles.hdrTitle}>Photo requests</Text>
        </View>

        <View style={styles.seg}>
          <Pressable
            style={[styles.sgItem, segment === 'sent' && styles.sgItemOn]}
            onPress={() => setSegment('sent')}>
            <Text style={[styles.sgText, segment === 'sent' && styles.sgTextOn]}>
              {`Sent${sent.length > 0 ? ` (${sent.length})` : ''}`}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.sgItem, segment === 'received' && styles.sgItemOn]}
            onPress={() => setSegment('received')}>
            <Text style={[styles.sgText, segment === 'received' && styles.sgTextOn]}>
              {`Received${received.length > 0 ? ` (${received.length})` : ''}`}
            </Text>
          </Pressable>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        {loading ? (
          <>
            <PhotoRequestSkeleton />
            <PhotoRequestSkeleton />
            <PhotoRequestSkeleton />
          </>
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {segment === 'sent' ? 'No photo requests sent' : 'No photo requests to answer'}
            </Text>
            <Text style={styles.emptyBody}>
              {segment === 'sent'
                ? 'Ask to see someone’s photos from their profile. They choose whether to share.'
                : 'When someone asks to see your photos, it will appear here for you to answer.'}
            </Text>
          </View>
        ) : segment === 'sent' ? (
          sent.map((r, i) => {
            const s = SENT_STATUS[r.status];
            return (
              <FadeInUp key={r.id} index={i} style={styles.card}>
                <View style={styles.rowTop}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.name}>{r.toUser.fullName ?? 'Unknown'}</Text>
                    {/* A ward may not have sent this themselves. Saying so is
                        the difference between a record and a surprise. */}
                    {r.sentByWali && (
                      <Text style={styles.sub}>Sent by your wali on your behalf</Text>
                    )}
                    <Text style={styles.meta}>{fmtAsked(r.requestedAt, 'Asked')}</Text>
                  </View>
                  <Chip variant={s.variant} label={s.label} />
                </View>
              </FadeInUp>
            );
          })
        ) : (
          received.map((r, i) => {
            const busy = answering === r.id;
            const forWard = r.viewerRole === 'wali';
            const ward = r.ownerUser.fullName?.split(' ')[0] ?? 'your ward';
            return (
              <FadeInUp key={r.id} index={i} style={styles.card}>
                <View style={styles.rowTop}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.name}>{r.fromUser.fullName ?? 'Unknown'}</Text>
                    {/* A guardian's queue mixes wards, and their own requests
                        sit in the same list — say whose photos these are. */}
                    {forWard && (
                      <Text style={styles.sub}>Asked to see {ward}’s photos</Text>
                    )}
                    {/* Never let a ward's request look like it came from the
                        person themselves when their guardian sent it. */}
                    {r.sentByWali && (
                      <Text style={styles.sub}>Sent by their wali</Text>
                    )}
                    <Text style={styles.meta}>{fmtAsked(r.requestedAt, 'Requested')}</Text>
                  </View>
                  <Chip {...receivedChip(r)} />
                </View>

                <Text style={styles.note}>{explain(r)}</Text>

                {r.status !== 'PENDING' ? (
                  /* Answered. The card stays as the record of it, and there is
                     nothing left to press — an approved request cannot be
                     declined afterwards; withdrawing is done in Privacy. */
                  null
                ) : r.canAnswer ? (
                  <View style={styles.acts}>
                    <Pressable
                      disabled={busy}
                      onPress={decline(r.id)}
                      style={({ pressed }) => [
                        styles.btn, styles.btnGhost,
                        pressed && { opacity: 0.85 }, busy && { opacity: 0.5 },
                      ]}>
                      <Text style={styles.btnGhostText}>Decline</Text>
                    </Pressable>
                    <Pressable
                      disabled={busy}
                      onPress={approve(r.id)}
                      style={({ pressed }) => [
                        styles.btn, styles.btnPrimary,
                        pressed && { opacity: 0.9 },
                      ]}>
                      {busy ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.btnPrimaryText}>
                          {forWard ? 'Approve for ' + ward : 'Share photos'}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                ) : (
                  /* Declining stays open to whoever is waiting: nobody should
                     have to approve something they mean to refuse just because
                     the order puts them second. */
                  <Pressable
                    disabled={busy}
                    onPress={decline(r.id)}
                    style={({ pressed }) => [
                      styles.btn, styles.btnGhost,
                      pressed && { opacity: 0.85 }, busy && { opacity: 0.5 },
                    ]}>
                    <Text style={styles.btnGhostText}>Decline anyway</Text>
                  </Pressable>
                )}

                {/* Only where it is actionable: the owner can change this, a
                    guardian reading their ward's queue cannot. */}
                {!forWard && !!onOpenPrivacy && (
                  <Pressable onPress={onOpenPrivacy} hitSlop={6}>
                    <Text style={styles.hint}>
                      You can change who answers these in Privacy and photos.
                    </Text>
                  </Pressable>
                )}
              </FadeInUp>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.page },
  scroll: { paddingHorizontal: 15 },

  hdr: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingBottom: 4 },
  backBtn: {
    width: 38, height: 38, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3C2878',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 3,
  },
  hdrTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, color: C.ink },

  seg: {
    flexDirection: 'row', backgroundColor: C.segBg, borderRadius: 14,
    padding: 4, marginTop: 12, marginBottom: 16,
  },
  sgItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 11 },
  sgItemOn: {
    backgroundColor: '#fff',
    shadowColor: 'rgba(40,30,80,0.08)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  sgText: { fontSize: 13.5, fontWeight: '700', color: C.ink3 },
  sgTextOn: { color: C.rose },

  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 16, paddingHorizontal: 18,
    marginBottom: 13, gap: 11,
    shadowColor: 'rgba(40,30,80,0.055)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1, shadowRadius: 14, elevation: 2,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 9 },
  rowLeft: { flex: 1 },
  name: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: C.ink },
  sub: { fontSize: 12.5, color: C.ink2, marginTop: 3 },
  meta: { fontSize: 11.5, color: C.ink3, marginTop: 5 },
  hint: { fontSize: 12, lineHeight: 18, color: C.indInk, fontWeight: '600' },
  note: { fontSize: 12.5, lineHeight: 19, color: C.ink2 },

  chip: { paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8, flexShrink: 0 },
  chipText: { fontSize: 10.5, fontWeight: '700' },

  acts: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: C.greySoft },
  btnGhostText: { fontSize: 14, fontWeight: '700', color: C.ink2 },
  btnPrimary: { backgroundColor: C.rose },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  spinner: { marginTop: 40 },
  error: { fontSize: 12.5, color: C.roseInk, textAlign: 'center', marginBottom: 10 },

  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 18, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  emptyBody: { fontSize: 13, lineHeight: 20, color: C.ink2, textAlign: 'center' },
});
