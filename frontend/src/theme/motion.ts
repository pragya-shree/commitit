/**
 * Motion tokens: durations and easings.
 *
 * Kept separate from the `animations/` module on purpose — these are raw
 * *values* (design decisions: "how long", "what curve"), while
 * `animations/presets.ts` composes them into ready-to-use Framer Motion
 * variants and transitions. Components that need a one-off transition
 * should still build it from these tokens rather than inventing a new
 * duration or curve.
 */

/** Durations in seconds (Framer Motion's native unit). */
export const duration = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.35,
  slow: 0.6,
  slower: 1,
  ambient: 22,
  ambientSlow: 34,
} as const;

/**
 * Cubic-bezier easings. `emphasized` is the workhorse for UI motion —
 * snappy start, soft landing, reads as premium rather than mechanical.
 * `linear` is reserved for continuous/looping motion (spins, drifting
 * blobs) where a resting point would look like a stutter.
 */
export const easing = {
  emphasized: [0.16, 1, 0.3, 1] as const,
  standard: [0.4, 0, 0.2, 1] as const,
  decelerate: [0, 0, 0.2, 1] as const,
  accelerate: [0.4, 0, 1, 1] as const,
  linear: [0, 0, 1, 1] as const,
};

/** Common Framer Motion `transition` objects, pre-built from the tokens above. */
export const transition = {
  fast: { duration: duration.fast, ease: easing.emphasized },
  normal: { duration: duration.normal, ease: easing.emphasized },
  slow: { duration: duration.slow, ease: easing.emphasized },
  spring: { type: "spring", stiffness: 260, damping: 24 } as const,
  springSoft: { type: "spring", stiffness: 160, damping: 20 } as const,
  springSnappy: { type: "spring", stiffness: 400, damping: 28 } as const,
} as const;
