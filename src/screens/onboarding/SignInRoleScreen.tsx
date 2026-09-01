/**
 * SignInRoleScreen
 *
 * Shown when the user taps "Sign in" on the welcome screen.
 * Lets them choose whether they are signing in as a Seeker or as a Wali.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { Colors, GradientColors } from '../../theme/colors';

// ─── types ────────────────────────────────────────────────────────────────────

export type SignInRole = 'self' | 'wali';

interface SignInRoleScreenProps {
  onBack?: () => void;
  onContinue?: (role: SignInRole) => void;
}

// ─── animation ────────────────────────────────────────────────────────────────

const RISE_DURATION = 520;
const RISE_EASING = Easing.bezier(0.2, 0.7, 0.3, 1);
const RISE_OFFSET = 14;

function useFadeRise(delay: number) {
  const anim = useRef(new Animated.Value(0)).current;
  return { anim, delay };
}

function riseStyle(anim: Animated.Value) {
  return {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [RISE_OFFSET, 0] }) }],
  };
}

// ─── icons ────────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"
      stroke={Colors.vioInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function UserIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 21v-1a7 7 0 0 1 16 0v1" />
    </Svg>
  );
}

function FamilyIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx={9} cy={7} r={3.5} />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </Svg>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function IconContainer({ selected, children }: { selected: boolean; children: React.ReactNode }) {
  if (selected) {
    return (
      <LinearGradient
        colors={[...GradientColors.primary]}
        locations={[...GradientColors.primaryLocations]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconContainer}>
        {children}
      </LinearGradient>
    );
  }
  return <View style={[styles.iconContainer, styles.iconContainerUnselected]}>{children}</View>;
}

function RoleCard({
  selected,
  onPress,
  icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onPress: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}>
      {selected ? (
        <LinearGradient
          colors={['#FEF0F6', '#F2ECFE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.cardInner}>
        <IconContainer selected={selected}>{icon}</IconContainer>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function SignInRoleScreen({ onBack, onContinue }: SignInRoleScreenProps) {
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<SignInRole>('self');

  const heading = useFadeRise(60);
  const cards   = useFadeRise(150);

  useEffect(() => {
    const run = ({ anim, delay }: ReturnType<typeof useFadeRise>) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: RISE_DURATION,
        delay,
        easing: RISE_EASING,
        useNativeDriver: true,
      });
    Animated.parallel([run(heading), run(cards)]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <AmbientBackground />

      <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 24) }]}>

        {/* Nav bar */}
        <View style={styles.navBar}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
            <BackIcon />
          </Pressable>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Animated.View
            style={[styles.headingWrap, riseStyle(heading.anim)]}
            needsOffscreenAlphaCompositing>
            <Text style={styles.heading}>Sign in as</Text>
            <Text style={styles.subheading}>Choose how you use Mehram.</Text>
          </Animated.View>

          <Animated.View
            style={[styles.cardsWrap, riseStyle(cards.anim)]}
            needsOffscreenAlphaCompositing>
            <RoleCard
              selected={role === 'self'}
              onPress={() => setRole('self')}
              icon={<UserIcon color={role === 'self' ? '#fff' : Colors.vioD} />}
              title="I am a seeker"
              subtitle="I am looking for a rishta"
            />
            <RoleCard
              selected={role === 'wali'}
              onPress={() => setRole('wali')}
              icon={<FamilyIcon color={role === 'wali' ? '#fff' : Colors.vioD} />}
              title="I am a wali"
              subtitle="I was invited by my dependent"
            />
          </Animated.View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <GradientButton label="Continue" onPress={() => onContinue?.(role)} />
        </View>
      </View>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.page,
    overflow: 'hidden',
  },
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    flexDirection: 'column',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  headingWrap: {
    paddingHorizontal: 2,
    marginBottom: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 34,
    color: Colors.ink,
  },
  subheading: {
    fontSize: 14,
    color: Colors.ink2,
    marginTop: 6,
    lineHeight: 20,
  },
  cardsWrap: {
    gap: 10,
  },
  card: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 7,
    elevation: 2,
  },
  cardSelected: {
    borderColor: Colors.vioD,
    shadowColor: '#A06EDC',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 16,
    paddingHorizontal: 15,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconContainerUnselected: {
    backgroundColor: Colors.vioSoft,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
  },
  cardSubtitle: {
    fontSize: 11,
    color: Colors.ink3,
    marginTop: 2,
  },
  footer: {
    paddingTop: 12,
  },
});
