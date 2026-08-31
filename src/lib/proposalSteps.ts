/**
 * The proposal approval flow, as one model shared by every screen that draws it.
 *
 * A proposal needs four approvals, sought in this order:
 *
 *   1. the suitor's own          2. his wali's
 *   3. her wali's                4. hers
 *
 * Three near-identical copies of this used to live in ProposalDetailScreen, each
 * keyed on a stage vocabulary the server stopped sending, so every one of them
 * fell through to its default. Keeping it in one place is also what lets the
 * wording stay honest: the same proposal is "you sent this" to the suitor and
 * "your ward sent this" to his wali, and the only way those can disagree is if
 * they are written twice.
 */

/** Server vocabulary (`ProposalStage` in prisma/schema.prisma). */
export type ProposalStage =
  | 'HIS_WALI_PENDING'
  | 'HER_WALI_REVIEWING'
  | 'HER_DECISION_PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'WITHDRAWN';

/** The four approvals. */
export type ApprovalKey = 'suitor' | 'suitorWali' | 'recipientWali' | 'recipient';

/** Whose screen this is being drawn on. */
export type Viewer = 'suitor' | 'suitorWali' | 'recipient' | 'recipientWali';

/**
 * Who actually sent it. A wali-sent proposal carries his ward's approval
 * implicitly, so the ward's step is already done the moment it is sent — and it
 * completes *after* the wali's, which is what makes the ordering below dynamic
 * rather than fixed.
 */
export type Origin = 'self' | 'wali';

export type StepState = 'done' | 'current' | 'waiting';

export interface ProposalStep {
  key: ApprovalKey;
  state: StepState;
  label: string;
  /** Secondary line, e.g. when the proposal was sent. */
  sub?: string;
  /** Position in the logical order (1-4). Stable — not the display position. */
  order: number;
}

export interface ProposalFlow {
  steps: ProposalStep[];
  /** Set when the flow ended early; no step is current in that case. */
  terminal: 'declined' | 'withdrawn' | null;
  doneCount: number;
  total: number;
}

/** The order approvals are sought in. */
const LOGICAL_ORDER: ApprovalKey[] = [
  'suitor',
  'suitorWali',
  'recipientWali',
  'recipient',
];

/**
 * How far each stage has got, as approvals completed in the order they happen.
 *
 * The stage is the authority on *what* is done; `Origin` only decides the order
 * the first two are reported in.
 */
const COMPLETED_THROUGH: Record<ProposalStage, number> = {
  HIS_WALI_PENDING: 1, // sent — the suitor's own approval
  HER_WALI_REVIEWING: 2, // his wali cleared it
  HER_DECISION_PENDING: 3, // her wali cleared it (or she has none)
  ACCEPTED: 4,
  // Terminal. The server does not say how far these got, so we claim only what
  // is certain: it was sent. Claiming zero rendered "You sent the proposal" as
  // not-started on a proposal that plainly was sent.
  DECLINED: 1,
  WITHDRAWN: 1,
};

/**
 * The sequence approvals are completed in.
 *
 * For a wali-sent proposal the wali acts first and the ward's approval follows
 * automatically, so the first two are swapped. Everything downstream is
 * unaffected.
 */
function completionSequence(origin: Origin): ApprovalKey[] {
  return origin === 'wali'
    ? ['suitorWali', 'suitor', 'recipientWali', 'recipient']
    : LOGICAL_ORDER;
}

interface LabelContext {
  viewer: Viewer;
  origin: Origin;
  state: StepState;
  /** The ward's name, for a wali's screen. Falls back to "your ward". */
  wardName?: string;
}

function label(key: ApprovalKey, ctx: LabelContext): string {
  const { viewer, origin, state } = ctx;
  const ward = ctx.wardName?.trim() || 'your ward';
  const done = state === 'done';
  const current = state === 'current';
  const waliSent = origin === 'wali';

  switch (viewer) {
    // ── The suitor: he sent it, or his wali sent it for him ──────────────────
    case 'suitor':
      switch (key) {
        case 'suitor':
          return waliSent
            ? 'Your approval — completed automatically'
            : 'You sent the proposal';
        case 'suitorWali':
          if (waliSent) return 'Your wali sent the proposal';
          return done
            ? 'Your wali approved'
            : current
              ? 'Your wali is reviewing'
              : "Your wali's approval";
        case 'recipientWali':
          return done
            ? 'Her wali approved'
            : current
              ? 'Her wali is reviewing'
              : "Her wali's approval";
        case 'recipient':
          return done ? 'She accepted' : current ? 'She is deciding' : 'Her approval';
      }
      break;

    // ── The suitor's wali: reviewing what his ward sent, or what he sent ─────
    case 'suitorWali':
      switch (key) {
        case 'suitor':
          return waliSent
            ? `${ward}'s approval — completed automatically`
            : `${ward} sent the proposal`;
        case 'suitorWali':
          if (waliSent) return 'You sent the proposal';
          return done
            ? 'You approved'
            : current
              ? 'Waiting for your approval'
              : 'Your approval';
        case 'recipientWali':
          return done
            ? 'Her wali approved'
            : current
              ? 'Her wali is reviewing'
              : "Her wali's approval";
        case 'recipient':
          return done ? 'She accepted' : current ? 'She is deciding' : 'Her approval';
      }
      break;

    // ── The recipient ────────────────────────────────────────────────────────
    case 'recipient':
      switch (key) {
        case 'suitor':
          return waliSent ? 'His wali sent the proposal' : 'He sent the proposal';
        case 'suitorWali':
          return done ? 'His wali approved' : "His wali's approval";
        case 'recipientWali':
          return done
            ? 'Your wali approved'
            : current
              ? 'Your wali is reviewing'
              : "Your wali's approval";
        case 'recipient':
          return done
            ? 'You accepted'
            : current
              ? 'Waiting for your answer'
              : 'Your approval';
      }
      break;

    // ── The recipient's wali ─────────────────────────────────────────────────
    case 'recipientWali':
      switch (key) {
        case 'suitor':
          return waliSent ? 'His wali sent the proposal' : 'He sent the proposal';
        case 'suitorWali':
          return done ? 'His wali approved' : "His wali's approval";
        case 'recipientWali':
          return done
            ? 'You approved'
            : current
              ? 'Waiting for your approval'
              : 'Your approval';
        case 'recipient':
          return done
            ? `${ward} accepted`
            : current
              ? `${ward} is deciding`
              : `${ward}'s approval`;
      }
      break;
  }
  // Unreachable: every viewer/key pair is covered above.
  return '';
}

export interface BuildStepsInput {
  stage: ProposalStage;
  viewer: Viewer;
  /** Defaults to 'self' — the common case, and what we assume when unknown. */
  origin?: Origin;
  /** Shown on the first completed step, e.g. the sent date. */
  sentAt?: string;
  wardName?: string;
}

/**
 * Builds the flow for one viewer.
 *
 * Display order is deliberately not the logical order: completed approvals rise
 * to the top in the sequence they were actually completed, and everything still
 * outstanding sits below in the order it will be sought. That way the top of the
 * list always reads as what has happened so far, and a step that completes out
 * of turn — the ward's automatic approval on a wali-sent proposal — appears
 * where it happened rather than where it would normally sit.
 */
export function buildProposalSteps({
  stage,
  viewer,
  origin = 'self',
  sentAt,
  wardName,
}: BuildStepsInput): ProposalFlow {
  const terminal =
    stage === 'DECLINED' ? 'declined' : stage === 'WITHDRAWN' ? 'withdrawn' : null;

  const sequence = completionSequence(origin);

  // A wali-sent proposal carries his ward's approval with it, so the first two
  // approvals land together at send time. The server still opens such a
  // proposal at HIS_WALI_PENDING — the stage that normally means "waiting on his
  // wali" — and taking that literally would show the ward being asked for an
  // approval the send already implied.
  //
  // Guarded on the stage: rows created before that backend change are still
  // sitting at HIS_WALI_PENDING with the flag set, and they really are waiting
  // on that wali — claiming his approval there would contradict the same
  // proposal listed in his review queue.
  const reached = COMPLETED_THROUGH[stage];
  const completedThrough =
    origin === 'wali' && reached >= 1 && stage !== 'HIS_WALI_PENDING'
      ? Math.max(reached, 2)
      : reached;

  const completed = sequence.slice(0, completedThrough);
  const completedSet = new Set<ApprovalKey>(completed);

  // The next approval in the sequence is the one being waited on — unless the
  // flow ended, in which case nothing is pending on anybody.
  const currentKey =
    terminal === null ? (sequence[completed.length] ?? null) : null;

  const pending = LOGICAL_ORDER.filter(k => !completedSet.has(k));

  const toStep = (key: ApprovalKey): ProposalStep => {
    const state: StepState = completedSet.has(key)
      ? 'done'
      : key === currentKey
        ? 'current'
        : 'waiting';
    return {
      key,
      state,
      label: label(key, { viewer, origin, state, wardName }),
      // Only the first completed step carries the date; repeating it on each
      // row would imply we know when every approval happened, and we do not.
      sub: state === 'done' && key === completed[0] ? sentAt : undefined,
      order: LOGICAL_ORDER.indexOf(key) + 1,
    };
  };

  return {
    steps: [...completed.map(toStep), ...pending.map(toStep)],
    terminal,
    doneCount: completed.length,
    total: LOGICAL_ORDER.length,
  };
}
