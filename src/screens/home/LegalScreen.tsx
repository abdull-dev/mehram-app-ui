/**
 * LegalScreen
 *
 * Reusable screen for Privacy Policy, Terms of Service, Refund Policy.
 * Shows a titled document with placeholder text.
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
import Svg, { Path } from 'react-native-svg';

const C = {
  indInk:  '#332C66',
  page:    '#F6F5FA',
  line:    '#EEEDF3',
  ink:     '#17171F',
  ink2:    '#5F5E70',
  ink3:    '#9695A5',
} as const;

function ChevLeft() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={C.indInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

const CONTENT: Record<string, { heading: string; lastUpdated: string; body: string }> = {
  privacy: {
    heading: 'Privacy Policy',
    lastUpdated: 'Last updated: 1 August 2026',
    body: `Mehram takes your privacy seriously. This policy explains how we collect, use, and protect your personal information.

1. Information we collect
We collect information you provide during registration (name, date of birth, phone number, email), profile information, and verification documents. ID documents are deleted immediately after verification.

2. How we use it
We use your information solely to match you with compatible profiles and facilitate wali-approved introductions. We do not sell your data to third parties.

3. Photos
Your photos are never shared without your explicit approval. You can revoke access at any time.

4. Location
We store your city only. We never store or share your exact GPS coordinates.

5. Contact details
Your contact details (phone, email) are never shown to other members. They are only revealed after both parties consent through the formal introduction process.

6. Data retention
You can delete your account at any time. All data is removed within 7 days of deletion.

7. Contact
For privacy questions: privacy@mehram.app`,
  },
  terms: {
    heading: 'Terms of Service',
    lastUpdated: 'Last updated: 1 August 2026',
    body: `By using Mehram, you agree to these terms.

1. Eligibility
You must be at least 18 years old and Muslim to use Mehram.

2. Wali requirement
Female users are required to have a registered wali (male guardian) to receive and accept proposals. This reflects the Islamic requirement for nikah.

3. Honest representation
You agree to provide accurate information about yourself. Misrepresentation is grounds for immediate account termination without refund.

4. Respectful conduct
You agree to treat all members with respect. Harassment, inappropriate messages, or circumventing the wali system will result in an immediate ban.

5. Membership
Membership is a one-time payment. We offer a 90-day refund guarantee if no wali-approved introduction is made.

6. Account termination
We reserve the right to terminate accounts that violate these terms without notice.

7. Contact
For terms questions: legal@mehram.app`,
  },
  refund: {
    heading: 'Refund Policy',
    lastUpdated: 'Last updated: 1 August 2026',
    body: `We stand behind our service with a simple refund guarantee.

Our Promise
If no wali-approved introduction happens within 90 days of your payment, we will refund you in full — no questions asked.

How to request a refund
1. Go to Settings > Membership > Request a refund.
2. We will process your refund within 5-7 business days.
3. Refunds are returned to your original payment method.

Exceptions
- Refunds are not available after 90 days from your payment date.
- If you delete your account before 90 days, the refund guarantee is voided.
- Members who violate our Terms of Service are not eligible for refunds.

What counts as a wali-approved introduction?
An introduction counts when your wali has approved a proposal and both parties have been connected.

Questions?
Email: refunds@mehram.app`,
  },
};

export type LegalType = 'privacy' | 'terms' | 'refund';

interface LegalScreenProps {
  type: LegalType;
  onBack?: () => void;
}

export function LegalScreen({ type, onBack }: LegalScreenProps) {
  const insets = useSafeAreaInsets();
  const content = CONTENT[type];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
          <ChevLeft />
        </Pressable>
        <Text style={styles.topBarTitle}>{content.heading}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 32, 40) }]}
        showsVerticalScrollIndicator={false}>

        <View style={styles.card}>
          <Text style={styles.lastUpdated}>{content.lastUpdated}</Text>
          <Text style={styles.body}>{content.body}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.page },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 15, paddingTop: 10, paddingBottom: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 13, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(40,30,80,0.07)', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  topBarTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: C.ink, flex: 1 },
  scroll: { paddingHorizontal: 15, paddingTop: 8 },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20,
    shadowColor: 'rgba(40,30,80,1)', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055, shadowRadius: 14, elevation: 3,
  },
  lastUpdated: { fontSize: 12, color: C.ink3, marginBottom: 16 },
  body: { fontSize: 13.5, color: C.ink2, lineHeight: 22 },
});
