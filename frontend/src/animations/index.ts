/**
 * Animations barrel export.
 *
 * `import { fadeUp, staggerContainer, floating, useMagneticHover } from
 * "@/animations"` — future components should always import presets from
 * here rather than writing inline Framer Motion variants/transitions, so
 * motion design stays consistent and changes to timing/easing only ever
 * need to happen in one place (`src/theme/motion.ts`).
 */

export * from "./variants";
export * from "./loops";
export * from "./useMagneticHover";
