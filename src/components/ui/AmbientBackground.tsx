/**
 * AmbientBackground
 *
 * Two soft radial blobs (lavender top-right, pink bottom-left) that sit
 * behind every onboarding screen. Mirrors the .phone::before / .phone::after
 * pseudo-elements in the HTML prototype.
 *
 * Uses react-native-svg RadialGradient so the blobs genuinely fade to
 * transparent, exactly as the CSS radial-gradient does.
 */

import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';

// How far outside the screen edge each blob centre sits (mirrors CSS values)
const BLOB1_OVERFLOW_RIGHT = 104;
const BLOB1_OVERFLOW_TOP = 96;
const BLOB1_RADIUS = 145; // half of 290px

const BLOB2_OVERFLOW_LEFT = 96;
const BLOB2_OVERFLOW_BOTTOM = 92;
const BLOB2_RADIUS = 130; // half of 260px

// Extra canvas padding so the SVG covers the off-screen centres
const PAD = Math.max(BLOB1_RADIUS, BLOB2_RADIUS) + 20;

export function AmbientBackground() {
  const { width, height } = useWindowDimensions();

  // Expanded canvas so off-screen blob centres are within the SVG viewport
  const svgW = width + PAD * 2;
  const svgH = height + PAD * 2;

  // Blob 1 — lavender, top-right corner
  // CSS: top:-96px right:-104px → centre = (W + 104 - 145, -96 + 145) + PAD offset
  const b1x = width + BLOB1_OVERFLOW_RIGHT - BLOB1_RADIUS + PAD;
  const b1y = -BLOB1_OVERFLOW_TOP + BLOB1_RADIUS + PAD;

  // Blob 2 — pink, bottom-left corner
  // CSS: bottom:-92px left:-96px → centre = (-96 + 130, H + 92 - 130) + PAD offset
  const b2x = -BLOB2_OVERFLOW_LEFT + BLOB2_RADIUS + PAD;
  const b2y = height + BLOB2_OVERFLOW_BOTTOM - BLOB2_RADIUS + PAD;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none">
      <Svg
        width={svgW}
        height={svgH}
        style={{ position: 'absolute', top: -PAD, left: -PAD }}>
        <Defs>
          <RadialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor="#DCD2FB" stopOpacity="0.85" />
            <Stop offset="68%" stopColor="#DCD2FB" stopOpacity="0" />
            <Stop offset="100%" stopColor="#DCD2FB" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="grad2" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor="#FBDCEB" stopOpacity="0.85" />
            <Stop offset="68%" stopColor="#FBDCEB" stopOpacity="0" />
            <Stop offset="100%" stopColor="#FBDCEB" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Lavender blob — top-right */}
        <Circle cx={b1x} cy={b1y} r={BLOB1_RADIUS} fill="url(#grad1)" />

        {/* Pink blob — bottom-left */}
        <Circle cx={b2x} cy={b2y} r={BLOB2_RADIUS} fill="url(#grad2)" />
      </Svg>
    </View>
  );
}
