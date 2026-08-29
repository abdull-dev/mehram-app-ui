/**
 * Slider
 *
 * Custom horizontal range slider matching the HTML prototype's
 * input[type=range] styling:
 *
 *   Track:  7 px tall, muted violet background, gradient-filled to thumb
 *   Thumb:  25 × 25 px circle, primary gradient fill, white border, purple glow
 *
 * Built with PanResponder + Animated.Value for smooth native-thread movement.
 * onValueChange is only called when the rounded integer value changes.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { GradientColors } from '../../theme/colors';

const THUMB = 25;
const TRACK_H = 7;
const WRAP_H = 48;

interface SliderProps {
  min: number;
  max: number;
  value: number;
  onValueChange: (v: number) => void;
}

export function Slider({ min, max, value, onValueChange }: SliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const onChangeRef = useRef(onValueChange);
  useEffect(() => { onChangeRef.current = onValueChange; }, [onValueChange]);

  // Animated position (0…trackWidth) drives thumb and fill without state updates
  const thumbX = useRef(new Animated.Value(0)).current;
  const lastEmitted = useRef(value);
  const startX = useRef(0);

  // Sync external value changes (e.g. parent clamps min/max) into thumbX
  const prevValue = useRef(value);
  if (prevValue.current !== value && trackWidthRef.current > 0) {
    prevValue.current = value;
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
    thumbX.setValue(ratio * trackWidthRef.current);
  }

  const clampedX = (x: number) =>
    Math.max(0, Math.min(trackWidthRef.current, x));

  const xToValue = (x: number): number => {
    const w = trackWidthRef.current;
    if (w === 0) return min;
    const ratio = clampedX(x) / w;
    return Math.round(ratio * (max - min) + min);
  };

  const updatePosition = (x: number) => {
    const cx = clampedX(x);
    thumbX.setValue(cx);
    const v = xToValue(cx);
    if (v !== lastEmitted.current) {
      lastEmitted.current = v;
      onChangeRef.current(v);
    }
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        startX.current = e.nativeEvent.locationX;
        updatePosition(startX.current);
      },
      onPanResponderMove: (_e, gs) => {
        updatePosition(startX.current + gs.dx);
      },
    }),
  ).current;

  const handleLayout = (w: number) => {
    trackWidthRef.current = w;
    setTrackWidth(w);
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
    thumbX.setValue(ratio * w);
    lastEmitted.current = value;
  };

  // Derived animated values
  const thumbLeft = Animated.subtract(thumbX, THUMB / 2);

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => handleLayout(e.nativeEvent.layout.width)}
      {...pan.panHandlers}
    >
      {/* Track background */}
      <View style={styles.track}>
        {/* Animated fill width */}
        <Animated.View style={[styles.fillContainer, { width: thumbX }]}>
          {trackWidth > 0 && (
            <LinearGradient
              colors={[...GradientColors.primary]}
              locations={[...GradientColors.primaryLocations]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.fill, { width: trackWidth }]}
            />
          )}
        </Animated.View>
      </View>

      {/* Thumb */}
      {trackWidth > 0 && (
        <Animated.View style={[styles.thumbContainer, { left: thumbLeft }]}>
          <LinearGradient
            colors={[...GradientColors.primary]}
            locations={[...GradientColors.primaryLocations]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.thumb}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: WRAP_H,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: 'rgba(155,123,240,0.2)',
    overflow: 'hidden',
  },
  fillContainer: {
    height: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  thumbContainer: {
    position: 'absolute',
    top: (WRAP_H - THUMB) / 2,
    width: THUMB,
    height: THUMB,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: 'rgba(180,100,200,1)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
    elevation: 5,
  },
});
