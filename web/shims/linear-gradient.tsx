import React from "react";
import { View, type ViewProps } from "react-native-web";

/**
 * `react-native-linear-gradient` for the web — the most-used native module in
 * the app, at 49 call sites.
 *
 * The gradient is painted by an absolutely-positioned child rather than by a
 * `backgroundImage` on the View itself, because RNW's style system does not
 * carry that property through. The child inherits the border radius, so a
 * rounded card still clips its own gradient, and it sits before `children` in
 * document order so the content always paints on top.
 */
export interface LinearGradientProps extends ViewProps {
  colors: readonly (string | number)[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: readonly number[];
  useAngle?: boolean;
  angle?: number;
  children?: React.ReactNode;
}

const DEFAULT_START = { x: 0.5, y: 0 };
const DEFAULT_END = { x: 0.5, y: 1 };

/**
 * React Native describes a gradient by the two points it runs between, in a
 * unit square whose y axis points down. CSS describes it by the angle it
 * travels, measured clockwise from "up". This converts one to the other.
 */
function cssAngle(
  start: { x: number; y: number },
  end: { x: number; y: number },
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return (deg + 360) % 360;
}

export function toCssGradient({
  colors,
  start = DEFAULT_START,
  end = DEFAULT_END,
  locations,
  useAngle,
  angle,
}: Pick<
  LinearGradientProps,
  "colors" | "start" | "end" | "locations" | "useAngle" | "angle"
>): string {
  const deg = useAngle && angle != null ? angle : cssAngle(start, end);
  const stops = colors.map((c, i) => {
    const at = locations?.[i];
    return at == null ? String(c) : `${c} ${Math.round(at * 1000) / 10}%`;
  });
  return `linear-gradient(${Math.round(deg * 10) / 10}deg, ${stops.join(", ")})`;
}

export default function LinearGradient({
  colors,
  start,
  end,
  locations,
  useAngle,
  angle,
  children,
  ...rest
}: LinearGradientProps) {
  const backgroundImage = toCssGradient({
    colors,
    start,
    end,
    locations,
    useAngle,
    angle,
  });

  return (
    <View {...rest}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage,
          borderRadius: "inherit",
          pointerEvents: "none",
        }}
      />
      {children}
    </View>
  );
}

export { LinearGradient };
