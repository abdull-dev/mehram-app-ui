/**
 * The four-approval flow, and specifically what happens when a side has no
 * wali to approve anything.
 */
import { buildProposalSteps } from '../src/lib/proposalSteps';

describe('buildProposalSteps', () => {
  describe('a side with no wali', () => {
    /**
     * Regression: the server opens a proposal at HER_DECISION_PENDING both when
     * two walis have cleared it and when neither party has one, because
     * `initialStage` skips the stages nobody can act on. Reading the stage alone
     * counted three of four approvals as granted, so a proposal sent seconds
     * earlier between two people with no wali showed its progress bar almost
     * full and its tracker crediting two reviews that never happened.
     */
    it('does not credit approvals nobody was asked for', () => {
      const flow = buildProposalSteps({
        stage: 'HER_DECISION_PENDING',
        viewer: 'suitor',
        suitorHasWali: false,
        recipientHasWali: false,
      });

      expect(flow.doneCount).toBe(1);
      expect(flow.total).toBe(2);

      const byKey = Object.fromEntries(flow.steps.map(s => [s.key, s.state]));
      expect(byKey.suitor).toBe('done');
      expect(byKey.suitorWali).toBe('skipped');
      expect(byKey.recipientWali).toBe('skipped');
      expect(byKey.recipient).toBe('current');
    });

    it('says why a skipped step will never complete', () => {
      const flow = buildProposalSteps({
        stage: 'HER_DECISION_PENDING',
        viewer: 'suitor',
        suitorHasWali: false,
        recipientHasWali: false,
        counterpartGender: 'FEMALE',
      });

      const labels = Object.fromEntries(flow.steps.map(s => [s.key, s.label]));
      expect(labels.suitorWali).toBe('No wali on your side — not required');
      expect(labels.recipientWali).toBe('She has no wali — not required');
    });

    it('skips only the side that has none', () => {
      const flow = buildProposalSteps({
        stage: 'HIS_WALI_PENDING',
        viewer: 'suitor',
        suitorHasWali: true,
        recipientHasWali: false,
      });

      const byKey = Object.fromEntries(flow.steps.map(s => [s.key, s.state]));
      expect(byKey.suitorWali).toBe('current');
      expect(byKey.recipientWali).toBe('skipped');
      expect(flow.total).toBe(3);
      expect(flow.doneCount).toBe(1);
    });

    it('waits on the recipient once the one real wali has cleared it', () => {
      const flow = buildProposalSteps({
        stage: 'HER_DECISION_PENDING',
        viewer: 'suitor',
        suitorHasWali: true,
        recipientHasWali: false,
      });

      const byKey = Object.fromEntries(flow.steps.map(s => [s.key, s.state]));
      expect(byKey.suitorWali).toBe('done');
      expect(byKey.recipient).toBe('current');
      expect(flow.doneCount).toBe(2);
      expect(flow.total).toBe(3);
    });

    it('reports every approval granted once accepted', () => {
      const flow = buildProposalSteps({
        stage: 'ACCEPTED',
        viewer: 'suitor',
        suitorHasWali: false,
        recipientHasWali: false,
      });

      expect(flow.doneCount).toBe(flow.total);
      expect(flow.steps.filter(s => s.state === 'current')).toHaveLength(0);
    });
  });

  // Callers that do not know yet must not have a phantom approval invented for
  // them: an unknown side keeps its step outstanding.
  it('keeps the full flow when wali state is unknown', () => {
    const flow = buildProposalSteps({
      stage: 'HIS_WALI_PENDING',
      viewer: 'suitor',
    });

    expect(flow.total).toBe(4);
    expect(flow.doneCount).toBe(1);
    expect(flow.steps.some(s => s.state === 'skipped')).toBe(false);
  });

  it('still tracks a wali-sent proposal from the wali step', () => {
    const flow = buildProposalSteps({
      stage: 'HER_DECISION_PENDING',
      viewer: 'suitor',
      origin: 'wali',
      suitorHasWali: true,
      recipientHasWali: false,
    });

    const byKey = Object.fromEntries(flow.steps.map(s => [s.key, s.state]));
    expect(byKey.suitorWali).toBe('done');
    expect(byKey.suitor).toBe('done');
    expect(byKey.recipientWali).toBe('skipped');
    expect(byKey.recipient).toBe('current');
  });

  describe('terminal stages', () => {
    it('claims only that it was sent, and waits on nobody', () => {
      const flow = buildProposalSteps({
        stage: 'WITHDRAWN',
        viewer: 'suitor',
        suitorHasWali: false,
        recipientHasWali: false,
      });

      expect(flow.terminal).toBe('withdrawn');
      expect(flow.doneCount).toBe(1);
      expect(flow.steps.filter(s => s.state === 'current')).toHaveLength(0);
    });
  });

  /**
   * Regression: every gendered word was hardcoded suitor-as-he,
   * recipient-as-she. A woman who proposed to a man was told "She is deciding"
   * about him, and "She has no wali" about his side of the family.
   */
  describe('pronouns follow the other party, not the role', () => {
    const stepsFor = (gender: string | null | undefined, viewer: 'suitor' | 'recipient') =>
      Object.fromEntries(
        buildProposalSteps({
          stage: 'HER_DECISION_PENDING',
          viewer,
          counterpartGender: gender,
        }).steps.map(s => [s.key, s.label]),
      );

    it('calls a male counterpart he, on the sending side', () => {
      const labels = stepsFor('MALE', 'suitor');
      expect(labels.recipient).toBe('His approval');
      expect(labels.recipientWali).toBe('His wali approved');
    });

    it('calls a female counterpart she, on the sending side', () => {
      const labels = stepsFor('FEMALE', 'suitor');
      expect(labels.recipient).toBe('Her approval');
      expect(labels.recipientWali).toBe('Her wali approved');
    });

    it('describes the sender by their own gender on the receiving side', () => {
      expect(stepsFor('FEMALE', 'recipient').suitor).toBe(
        'She sent the proposal',
      );
      expect(stepsFor('MALE', 'recipient').suitor).toBe('He sent the proposal');
    });

    // Never inferred from a name or from which side of the flow someone is on.
    it('falls back to they when the server does not say', () => {
      const labels = stepsFor(undefined, 'suitor');
      expect(labels.recipient).toBe('Their approval');
      expect(labels.recipientWali).toBe('Their wali approved');
    });

    it('agrees the verb for the they fallback', () => {
      const flow = buildProposalSteps({
        stage: 'HER_DECISION_PENDING',
        viewer: 'suitor',
        recipientHasWali: false,
        counterpartGender: null,
      });
      const labels = Object.fromEntries(flow.steps.map(s => [s.key, s.label]));
      expect(labels.recipientWali).toBe('They have no wali — not required');
    });

    // The step is named by whose approval it is, matching every other row,
    // rather than by what that person is currently doing.
    it('names the outstanding approval rather than the activity', () => {
      const current = buildProposalSteps({
        stage: 'HER_DECISION_PENDING',
        viewer: 'suitor',
        counterpartGender: 'MALE',
      }).steps.find(s => s.key === 'recipient');

      expect(current?.state).toBe('current');
      expect(current?.label).toBe('His approval');
    });

    it('says what happened once it is granted', () => {
      const done = buildProposalSteps({
        stage: 'ACCEPTED',
        viewer: 'suitor',
        counterpartGender: 'MALE',
      }).steps.find(s => s.key === 'recipient');

      expect(done?.label).toBe('He accepted');
    });
  });
});
