import { type CSSProperties, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { brand, gradients, radius as radiusTokens, duration, easing } from "@/theme";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { GlassRadius } from "./GlassPanel";

/**
 * GradientBorder — wraps content in a thin gradient-colored ring, using
 * the classic "padding as border thickness" trick: an outer box painted
 * with the gradient, an inner box (offset by the padding) painted solid,
 * covering everything except a `thickness`-px ring at the edge.
 *
 * The gradient layer is always rendered oversized (200% in each
 * dimension, centered) rather than exactly filling the box. That's a
 * no-op for the static case, but it's what makes `animated` work: a
 * `rotate` transform (GPU-composited, not repainted) needs the layer to
 * be larger than its container's diagonal so no gap appears at any
 * rotation angle — sizing it once, the same way, for both cases keeps
 * the two code paths nearly identical.
 */

type GradientVariant = "warm" | "warmSoft" | "alive";

interface GradientBorderProps {
  variant?: GradientVariant;
  /** Border thickness in px. */
  thickness?: number;
  radius?: GlassRadius;
  /** Slowly rotate the gradient for a subtle animated shimmer. Off by default — use for a single standout moment, not everywhere. */
  animated?: boolean;
  className?: string;
  children: ReactNode;
}

const conicSweep = `conic-gradient(from 0deg, ${brand.coral}, ${brand.magenta}, ${brand.violet}, ${brand.mint}, ${brand.coral})`;

export function GradientBorder({
  variant = "warm",
  thickness = 1.5,
  radius = "xl",
  animated = false,
  className,
  children,
}: GradientBorderProps) {
  const reduceMotion = usePrefersReducedMotion();
  const outerRadius = radiusTokens[radius];
  const innerRadius = `calc(${outerRadius} - ${thickness}px)`;
  const shouldAnimate = animated && !reduceMotion;

  return (
    <div
      className={cn("relative isolate overflow-hidden", className)}
      style={{ padding: thickness, borderRadius: outerRadius } as CSSProperties}
    >
      {shouldAnimate ? (
        <motion.div
          className="absolute inset-[-50%]"
          style={{ backgroundImage: conicSweep }}
          animate={{ rotate: 360 }}
          transition={{ duration: duration.ambient, repeat: Infinity, ease: easing.linear }}
        />
      ) : (
        <div className="absolute inset-[-50%]" style={{ backgroundImage: gradients[variant] }} />
      )}
      <div className="relative h-full w-full bg-void-950" style={{ borderRadius: innerRadius }}>
        {children}
      </div>
    </div>
  );
}
