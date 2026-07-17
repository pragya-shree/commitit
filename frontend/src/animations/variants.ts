import type { Variants } from "framer-motion";
import { duration, easing } from "@/theme";

/**
 * Entrance/exit variant presets.
 *
 * Every preset here is a *factory function*, not a static object — so
 * call sites can tune delay/duration/distance without redefining the
 * whole variant, while everything still resolves back to the shared
 * duration/easing tokens instead of a one-off magic number.
 *
 * `reduceMotion` is a plain boolean parameter rather than a hook call:
 * these factories run at render time (often outside a component), so
 * the caller reads `usePrefersReducedMotion()` once and passes the
 * result in. When true, movement collapses to a simple, near-instant
 * opacity change instead of being skipped entirely — content should
 * still visibly appear, just without the motion.
 */

interface FadeOptions {
  /** Seconds to wait before the enter animation starts. */
  delay?: number;
  /** Seconds the enter animation takes. */
  duration?: number;
  /** Vertical travel distance in px (fadeUp only). */
  distance?: number;
  reduceMotion?: boolean;
}

/** Fades in while rising up slightly — the default "content has arrived" motion. */
export function fadeUp({
  delay = 0,
  duration: enterDuration = duration.normal,
  distance = 24,
  reduceMotion = false,
}: FadeOptions = {}): Variants {
  return {
    hidden: { opacity: 0, y: reduceMotion ? 0 : distance },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduceMotion ? duration.instant : enterDuration,
        delay: reduceMotion ? 0 : delay,
        ease: easing.emphasized,
      },
    },
  };
}

/** Plain opacity fade, no movement — for content where a rising motion would be distracting. */
export function fadeIn({
  delay = 0,
  duration: enterDuration = duration.normal,
  reduceMotion = false,
}: Omit<FadeOptions, "distance"> = {}): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: reduceMotion ? duration.instant : enterDuration,
        delay: reduceMotion ? 0 : delay,
        ease: easing.emphasized,
      },
    },
  };
}

interface StaggerContainerOptions {
  /** Seconds between each child's animation start. */
  staggerChildren?: number;
  /** Seconds before the first child starts. */
  delayChildren?: number;
  reduceMotion?: boolean;
}

/**
 * Applied to a parent `motion.div`; combine with `staggerItem` on each
 * child and `initial="hidden" animate="visible"` (or `whileInView`) on
 * the parent — children pick up "hidden"/"visible" automatically via
 * variant propagation, no need to repeat props on every child.
 */
export function staggerContainer({
  staggerChildren = 0.08,
  delayChildren = 0,
  reduceMotion = false,
}: StaggerContainerOptions = {}): Variants {
  return {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduceMotion ? 0 : staggerChildren,
        delayChildren: reduceMotion ? 0 : delayChildren,
      },
    },
  };
}

/** Child variant for use inside a `staggerContainer` parent. */
export function staggerItem({
  distance = 16,
  duration: enterDuration = duration.normal,
  reduceMotion = false,
}: Omit<FadeOptions, "delay"> = {}): Variants {
  return {
    hidden: { opacity: 0, y: reduceMotion ? 0 : distance },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? duration.instant : enterDuration, ease: easing.emphasized },
    },
  };
}

interface PageTransitionOptions {
  distance?: number;
  reduceMotion?: boolean;
}

/**
 * For use with `AnimatePresence` around routed/swapped page content:
 * `<motion.div variants={pageTransition()} initial="initial" animate="animate" exit="exit" />`
 */
export function pageTransition({ distance = 12, reduceMotion = false }: PageTransitionOptions = {}): Variants {
  return {
    initial: { opacity: 0, y: reduceMotion ? 0 : distance },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? duration.instant : duration.normal, ease: easing.emphasized },
    },
    exit: {
      opacity: 0,
      y: reduceMotion ? 0 : -distance,
      transition: { duration: reduceMotion ? duration.instant : duration.fast, ease: easing.accelerate },
    },
  };
}
