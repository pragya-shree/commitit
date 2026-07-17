import { cn } from "@/utils/cn";
import { MeshGradientBlobs } from "./MeshGradientBlobs";
import { FloatingParticles } from "./FloatingParticles";
import { FloatingCodeIcons } from "./FloatingCodeIcons";
import { NoiseOverlay } from "./NoiseOverlay";

/**
 * AnimatedBackground — the "living code universe" atmosphere: a static
 * mesh gradient wash, independently drifting color blobs, twinkling
 * particles, faint floating code glyphs, and a grain overlay, layered
 * back to front. Meant to be mounted once as the app's global background
 * layer, behind everything else.
 *
 * Entirely decorative — `aria-hidden` and `pointer-events-none` so it
 * never appears to assistive tech and never intercepts interaction, no
 * matter what's layered on top of it.
 *
 * Every layer is independently GPU-friendly: the mesh/blobs use CSS
 * `transform`-based keyframes (already covered by the global
 * `prefers-reduced-motion` rule in index.css), and the Framer-driven
 * particles/icons animate only `transform`/`opacity` and explicitly
 * check `usePrefersReducedMotion()` themselves (see each sub-component
 * for why both mechanisms are needed — CSS animations and Framer's
 * JS-driven loops aren't covered by the same reduced-motion path).
 */

interface AnimatedBackgroundProps {
  className?: string;
  /**
   * "fixed" pins the background to the viewport — the default, for
   * mounting once as the global background. "absolute" scopes it to the
   * nearest positioned ancestor instead, for using it behind a single
   * section rather than the whole app.
   */
  position?: "fixed" | "absolute";
}

export function AnimatedBackground({ className, position = "fixed" }: AnimatedBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none inset-0 z-0 overflow-hidden bg-void-950",
        position === "fixed" ? "fixed" : "absolute",
        className,
      )}
    >
      <MeshGradientBlobs />
      <FloatingParticles />
      <FloatingCodeIcons />
      <NoiseOverlay />
    </div>
  );
}
