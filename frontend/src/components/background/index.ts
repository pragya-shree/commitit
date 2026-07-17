/**
 * Background barrel export.
 *
 * `import { AnimatedBackground } from "@/components/background"` — mount
 * once as the app's global background layer. Sub-components
 * (MeshGradientBlobs, FloatingParticles, FloatingCodeIcons, NoiseOverlay)
 * are exported too, in case a future screen needs just one layer rather
 * than the full composed background.
 */

export * from "./AnimatedBackground";
export * from "./MeshGradientBlobs";
export * from "./FloatingParticles";
export * from "./FloatingCodeIcons";
export * from "./NoiseOverlay";
