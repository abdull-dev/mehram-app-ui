/**
 * ProfileIncompleteBlock — H6: Profile Incomplete
 *
 * Matches mehram-home-18-states.html H6 exactly:
 *
 *  Hero (calm indigo) — amber dot, "NOT SEARCHING YET" label,
 *   "Finish your biodata to begin", mint progress bar + "N of 8 sections complete"
 *
 *  Steps card — inside a white card:
 *   done  → mint circle + ✓ + normal weight title
 *   next  → rose circle + step# + bold title + "Next section" subtitle
 *   wait  → gray circle + step# + muted title
 *
 *  CTA card — "Continue profile" rose gradient button
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../theme/colors';

// ─── hero gradient (calm indigo — waiting / blocked) ──────────────────────────
const HERO_GRAD = ['#5F55A8', '#3E3776', '#2B2653'] as const;

// ─── section definitions ───────────────────────────────────────────────────────
// doneFrom = ONBOARDING_SCREENS index at/after which this section is complete
const ONBOARDING_SCREENS = [
  'WhoIsFor', 'F6', 'F7', 'F8', 'F10',
  'F11', 'F12', 'F13', 'F14', 'F15', 'F16', 'F17', 'F18',
];

const SECTIONS = [
  { label: 'Basic identity',      doneFrom: 1, required: true  }, // past WhoIsFor
  { label: 'Your location',       doneFrom: 3, required: true  }, // past F7
  { label: 'About you',           doneFrom: 4, required: true  }, // past F8
  { label: 'Family & home',       doneFrom: 6, required: false }, // past F11
  { label: 'Your story',          doneFrom: 7, required: true  }, // past F12
  { label: 'Partner preferences', doneFrom: 8, required: true  }, // past F13
  { label: 'Your photos',         doneFrom: 9, required: false }, // past F14
];

type StepStatus = 'done' | 'next' | 'wait';

/** Returns true when every section (required + optional) is complete. */
export function allSectionsDone(resumeScreen: string): boolean {
  const idx = ONBOARDING_SCREENS.indexOf(resumeScreen);
  const ri = idx === -1 ? 0 : idx;
  return SECTIONS.every(s => ri >= s.doneFrom);
}

function computeSteps(resumeScreen: string) {
  const idx = ONBOARDING_SCREENS.indexOf(resumeScreen);
  const ri = idx === -1 ? 0 : idx;
  let nextAssigned = false;

  return SECTIONS.map((s, i) => {
    const stepNum = i + 1;
    if (ri >= s.doneFrom) return { status: 'done' as StepStatus, label: s.label, num: stepNum, required: s.required };
    if (!nextAssigned) {
      nextAssigned = true;
      return { status: 'next' as StepStatus, label: s.label, num: stepNum, required: s.required };
    }
    return { status: 'wait' as StepStatus, label: s.label, num: stepNum, required: s.required };
  });
}

// ─── checkmark icon ───────────────────────────────────────────────────────────
function CheckMark() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.5l5 5 9-10"
        stroke="#fff"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── component ────────────────────────────────────────────────────────────────
interface ProfileIncompleteBlockProps {
  onContinue?: () => void;
  resumeScreen?: string;
  userName?: string;
}

export function ProfileIncompleteBlock({
  onContinue,
  resumeScreen = 'WhoIsFor',
  userName = '',
}: ProfileIncompleteBlockProps) {
  const insets = useSafeAreaInsets();

  const steps = computeSteps(resumeScreen);
  const doneCount = steps.filter(s => s.status === 'done').length;
  const total = SECTIONS.length;
  const pct = Math.round((doneCount / total) * 100);

  // All sections complete — nothing to show; caller's onboardingComplete
  // flag may lag behind (e.g. DB write in flight), so guard here too.
  if (doneCount === total) return null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top + 16, 32),
            paddingBottom: Math.max(insets.bottom + 100, 110),
          },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* ── Greeting header ───────────────────────────────────────── */}
        {userName ? (
          <View style={styles.hdr}>
            <Text style={styles.salam}>Assalamu alaikum</Text>
            <Text style={styles.hdrName}>{userName}</Text>
          </View>
        ) : null}

        {/* ── Hero ──────────────────────────────────────────────────── */}
        <LinearGradient
          colors={[...HERO_GRAD]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={styles.hero}>

          {/* amber dot + label */}
          <View style={styles.htop}>
            <View style={styles.pulseAmber} />
            <Text style={styles.hlbl}>NOT SEARCHING YET</Text>
          </View>

          <Text style={styles.hh}>{'Finish your\nbiodata to begin'}</Text>
          <Text style={styles.hp}>
            We can't look for matches until your biodata is complete. About four minutes.
          </Text>

          {/* progress bar */}
          <View style={styles.hbar}>
            <View style={[styles.hbarFill, { width: `${pct}%` as any }]} />
          </View>
          <Text style={styles.hnote}>{doneCount} of {total} sections complete</Text>
        </LinearGradient>

        {/* ── Steps card ────────────────────────────────────────────── */}
        <View style={styles.stepsCard}>
          {steps.map((step, i) => (
            <View key={i} style={styles.st}>

              {/* circle indicator */}
              <View style={[
                styles.std,
                step.status === 'done' ? styles.sdDone :
                step.status === 'next' ? styles.sdNext :
                styles.sdWait,
              ]}>
                {step.status === 'done'
                  ? <CheckMark />
                  : <Text style={[
                      styles.stdNum,
                      step.status === 'wait' && styles.stdNumWait,
                    ]}>{step.num}</Text>
                }
              </View>

              {/* text */}
              <View style={styles.stBody}>
                <View style={styles.stTitleRow}>
                  <Text style={[
                    styles.stt,
                    step.status === 'next' && styles.sttNext,
                    step.status === 'wait' && styles.sttMuted,
                  ]}>
                    {step.label}
                  </Text>
                  <View style={[styles.badge, step.required ? styles.badgeReq : styles.badgeOpt]}>
                    <Text style={[styles.badgeText, step.required ? styles.badgeTextReq : styles.badgeTextOpt]}>
                      {step.required ? 'Required' : 'Optional'}
                    </Text>
                  </View>
                </View>
                {step.status === 'next' && (
                  <Text style={styles.sts}>Next section</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* ── CTA card ──────────────────────────────────────────────── */}
        <View style={styles.ctaCard}>
          <Pressable
            onPress={onContinue}
            style={({ pressed }) => ({
              opacity: pressed ? 0.88 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}>
            <LinearGradient
              colors={['#F2559A', '#E6396E']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.roseBtn}>
              <Text style={styles.roseBtnText}>Continue profile</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const MINT  = '#17B07E';
const ROSE  = '#E6396E';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.page },

  // gap:14 matches HTML's margin-bottom:14px on .hero and .card
  scroll: { paddingHorizontal: 16, gap: 14 },

  // ── Hero — .hero.wait{border-radius:26px;padding:19px} ───────────────────────
  hero: { borderRadius: 26, padding: 19 },

  // .htop{gap:9px;margin-bottom:9px}
  htop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 9,
  },

  // .pulse.a{background:#F2C14E;box-shadow:0 0 0 5px rgba(242,193,78,.2)}
  pulseAmber: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#F2C14E',
  },

  // .hlbl{font-size:11px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:#CFC4F5}
  hlbl: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: '#CFC4F5',
    textTransform: 'uppercase',
  },

  hh: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.4,
    lineHeight: 33,
  },

  hp: {
    fontSize: 14,
    lineHeight: 23,
    color: '#CBC1EE',
    marginTop: 8,
  },

  // .hbar{height:6px;border-radius:4px;background:rgba(255,255,255,.18);margin-top:15px}
  hbar: {
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginTop: 15,
    overflow: 'hidden',
  },
  // .hbar i{background:#5BE3B0}
  hbarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#5BE3B0',
  },

  // .hnote{font-size:11px;color:#B5A9E4;margin-top:8px}
  hnote: {
    fontSize: 11,
    color: '#B5A9E4',
    marginTop: 8,
  },

  // ── Steps card — .card{background:#fff;border-radius:26px;box-shadow:0 3px 14px rgba(40,30,80,.055)}
  // inner padding from HTML: style="padding:6px 19px 12px"
  stepsCard: {
    backgroundColor: '#fff',
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 2,
  },

  st: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 13,
    alignItems: 'flex-start',
  },

  std: {
    width: 30,
    height: 30,
    borderRadius: 15,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // .sd{background:var(--mint);color:#fff}  mint = #17B07E
  sdDone: { backgroundColor: MINT },
  // .sn{background:var(--rose);color:#fff}  rose = #E6396E
  sdNext: { backgroundColor: ROSE },
  // .sw{background:#EDECF3;color:var(--ink-3)}
  sdWait: { backgroundColor: '#EDECF3' },

  stdNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  stdNumWait: {
    color: '#9695A5',
  },

  stBody: { flex: 1 },

  stTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },

  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeReq: { backgroundColor: 'rgba(230,57,110,0.10)' },
  badgeOpt: { backgroundColor: 'rgba(150,149,165,0.12)' },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  badgeTextReq: { color: '#E6396E' },
  badgeTextOpt: { color: '#9695A5' },

  stt: {
    fontSize: 16,
    fontWeight: '600',
    color: '#17171F',
  },
  // next: visually bolder than done to highlight current step
  sttNext: {
    fontWeight: '700',
  },
  // .stt.m{color:var(--ink-3);font-weight:500}
  sttMuted: {
    color: '#9695A5',
    fontWeight: '500',
  },

  sts: {
    fontSize: 13,
    color: '#9695A5',
    marginTop: 2,
    lineHeight: 19,
  },

  // ── CTA card — .card + .acts.one .btn-f ──────────────────────────────────────
  // .card{background:#fff;border-radius:26px;box-shadow:...}
  // .btn-f{height:48px;border-radius:15px;font-size:14.5px;font-weight:700}
  ctaCard: {
    backgroundColor: '#fff',
    borderRadius: 26,
    padding: 19,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 2,
  },

  roseBtn: {
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  roseBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Greeting header — .hdr ────────────────────────────────────────────────────
  // .hdr{padding:11px 4px 13px}
  hdr: {
    paddingHorizontal: 4,
    paddingTop: 11,
    paddingBottom: 13,
  },
  // .salam{font-size:13.5px;color:var(--ink-3)}
  salam: {
    fontSize: 13.5,
    color: '#9695A5',
  },
  // .name{font-size:25px;font-weight:700;letter-spacing:-.6px;margin-top:1px}
  hdrName: {
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: '#17171F',
    marginTop: 1,
  },
});
