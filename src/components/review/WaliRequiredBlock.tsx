/**
 * WaliRequiredBlock — verified and paid, but no wali linked.
 *
 * Shown when the server reports WALI_REQUIRED. This is not a nag: without an
 * accepted guardian the account is genuinely inert. Discovery excludes seekers
 * with no wali, and the server refuses any proposal they try to send — so a
 * user in this state would otherwise sit on a "search active" screen wondering
 * why nothing ever arrives.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Colors, GradientColors } from '../../theme/colors';
import { GradientButton } from '../ui/GradientButton';
import { DailyDuaCard } from '../ui/DailyDuaCard';

function ShieldIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l7 3v6c0 4.5-3 8.3-7 9.5C8 19.3 5 15.5 5 11V5l7-3z"
        stroke="#fff"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface Props {
  userName?: string;
  onAddWali?: () => void;
}

export function WaliRequiredBlock({ userName, onAddWali }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[
        s.content,
        {
          // Clears the menu/filter buttons HomeScreen floats over this block —
          // the badge was rendering underneath them.
          paddingTop: Math.max(insets.top, 16) + 64,
          paddingBottom: Math.max(insets.bottom + 100, 120),
        },
      ]}
      showsVerticalScrollIndicator={false}>

      <LinearGradient
        colors={[...GradientColors.primary]}
        locations={[...GradientColors.primaryLocations]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={s.badge}>
        <ShieldIcon />
      </LinearGradient>

      <Text style={s.kicker}>NOT DISCOVERABLE YET</Text>
      <Text style={s.title}>
        {userName ? `${userName}, add your wali` : 'Add your wali'}
      </Text>
      <Text style={s.body}>
        Your profile is verified and your membership is active, but nobody can
        see you yet — and you cannot send a proposal until a wali is on your
        account.
      </Text>

      <View style={s.card}>
        <Text style={s.cardLabel}>WHY THIS IS REQUIRED</Text>
        <Text style={s.cardBody}>
          Every proposal passes through a guardian before it reaches the other
          person. Without one there is nobody to review yours, so we keep your
          profile out of introductions rather than show you to families you
          could not proceed with.
        </Text>
      </View>

      <View style={s.cta}>
        <GradientButton label="Add my wali" onPress={onAddWali} />
        <Text style={s.help}>
          They only need an invite link or a six-digit code.
        </Text>
      </View>

      <DailyDuaCard index={1} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.page },
  content: { paddingHorizontal: 16 },
  badge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 22,
    // Lifts it off the page the way the other home heroes are lifted.
    shadowColor: '#3C2878',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  kicker: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: Colors.vioD,
    textAlign: 'center',
    marginBottom: 10,
    // A pill, so the label reads as a status rather than floating text.
    alignSelf: 'center',
    backgroundColor: Colors.vioSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 29,
    color: Colors.ink,
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    color: Colors.ink2,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  card: {
    marginTop: 24,
    backgroundColor: Colors.goldSoft,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  cardLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    color: Colors.goldInk,
    marginBottom: 6,
  },
  cardBody: { fontSize: 13, color: Colors.goldInk, lineHeight: 20 },
  cta: { marginTop: 20, marginBottom: 24 },
  help: {
    fontSize: 12,
    color: Colors.ink3,
    textAlign: 'center',
    marginTop: 12,
  },
});
