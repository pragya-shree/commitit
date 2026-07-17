import type { TargetAndTransition, Transition } from "framer-motion";
import { duration, easing } from "@/theme";

/**
 * Continuous/looping presets — for ambient decorative motion that plays
 * indefinitely (as opposed to `variants.ts`, which is for one-shot
 * enter/exit/stagger motion tied to a component's lifecycle).
 *
 * Shape: `{ animate, transition }`, meant to be spread directly onto a
 * `motion.*` component — `<motion.div {...floating()} />` — since Framer
 * Motion keeps continuous keyframe animation on `animate` and its timing
 * on the separate `transition` prop, rather than inside a `Variants` map.
 *
 * These intentionally *don't* reuse the CSS `@keyframes drift`/`twinkle`
 * defined in `index.css` — those exist for the large-scale ambient
 * background wash, which never needs to respond to props, orchestration,
 * or JS state, so plain CSS is cheaper there. These presets are for
 * individual React components (an icon, a badge, a glow behind a button)
 * that need parameterized, composable motion driven from the same
 * duration/easing tokens — same design language, different mechanism for
 * a different job, not the same logic implemented twice.
 */

interface LoopPreset {
  animate: TargetAndTransition;
  transition: Transition;
}

interface FloatingOptions {
  /** Vertical travel distance in px. */
  distance?: number;
  /** Seconds per full loop. */
  duration?: number;
  /** Seconds before the loop starts — stagger multiple floating elements with this. */
  delay?: number;
  reduceMotion?: boolean;
}

/** Gentle, continuous vertical bob — for icons, badges, or particles that should feel "alive". */
export function floating({
  distance = 14,
  duration: loopDuration = 6,
  delay = 0,
  reduceMotion = false,
}: FloatingOptions = {}): LoopPreset {
  if (reduceMotion) {
    return { animate: { y: 0 }, transition: { duration: duration.instant } };
  }
  return {
    animate: { y: [0, -distance, 0] },
    transition: { duration: loopDuration, delay, repeat: Infinity, ease: easing.standard },
  };
}

interface PulseGlowOptions {
  /** Opacity at the dimmest point of the pulse. */
  minOpacity?: number;
  /** Opacity at the brightest point of the pulse. */
  maxOpacity?: number;
  /** [min, max] scale range for the pulse. */
  scaleRange?: [number, number];
  /** Seconds per full pulse. */
  duration?: number;
  delay?: number;
  reduceMotion?: boolean;
}

/** Slow opacity + scale pulse — for glow auras behind buttons, active-state indicators, "thinking" states. */
export function pulseGlow({
  minOpacity = 0.45,
  maxOpacity = 1,
  scaleRange = [0.96, 1.04],
  duration: loopDuration = 3.2,
  delay = 0,
  reduceMotion = false,
}: PulseGlowOptions = {}): LoopPreset {
  if (reduceMotion) {
    return { animate: { opacity: maxOpacity, scale: 1 }, transition: { duration: duration.instant } };
  }
  return {
    animate: {
      opacity: [minOpacity, maxOpacity, minOpacity],
      scale: [scaleRange[0], scaleRange[1], scaleRange[0]],
    },
    transition: { duration: loopDuration, delay, repeat: Infinity, ease: easing.standard },
  };
}
