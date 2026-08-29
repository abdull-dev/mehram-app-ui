/**
 * Furthest onboarding screen as a bounded integer (PATCH /auth/onboarding-step).
 * One map: invert it to resume. Do not keep a second table in App.tsx.
 */
export const ONBOARDING_STEP = {
  F6: 6,
  F7: 7,
  F8: 8,
  F10: 10,
  F11: 11,
  F12: 12,
  F13: 13,
  F14: 14,
  F15: 15,
  F16: 16,
  F17: 17,
  F18: 18,
  H11: 19,
} as const;

export type OnboardingScreen = keyof typeof ONBOARDING_STEP;

const SKIP_PAST: Partial<Record<OnboardingScreen, OnboardingScreen>> = {
  F15: 'F16',
  F16: 'F17',
};

export function stepNumberFor(screen: string): number | undefined {
  if (screen in ONBOARDING_STEP) {
    return ONBOARDING_STEP[screen as OnboardingScreen];
  }
  return undefined;
}

export type ResumeOutcome =
  | { kind: 'home' }
  | { kind: 'done' }
  | { kind: 'screen'; screen: OnboardingScreen };

export function resumeFromOnboardingStep(step: number): ResumeOutcome {
  const screen = (Object.keys(ONBOARDING_STEP) as OnboardingScreen[]).find(
    key => ONBOARDING_STEP[key] === step,
  );
  if (!screen) return { kind: 'home' };
  if (screen === 'F17' || screen === 'F18') return { kind: 'done' };
  return { kind: 'screen', screen: SKIP_PAST[screen] ?? screen };
}
