import { forwardRef, type ComponentPropsWithoutRef, type CSSProperties, type ElementType, type ReactNode } from "react";
import { cn } from "@/utils/cn";
import { radius as radiusTokens, shadow as shadowTokens } from "@/theme";

/**
 * GlassPanel — the base glassmorphic surface everything else in this
 * design language sits on top of (cards, panels, nav chrome, dialogs
 * later). Owns exactly one visual idea — "frosted, tinted, softly
 * bordered surface" — with variants for how strong that effect reads.
 *
 * `default`/`elevated` reuse the `glass-panel` utility class defined in
 * index.css (blur + tinted background + hairline border, all sourced
 * from theme color tokens); `elevated` additionally adds the neutral
 * `shadow.lg` token for surfaces that need to visually lift off the
 * page. `subtle` is a lighter-weight variant for nested/secondary
 * surfaces where a full glass effect would be too heavy.
 */

export type GlassVariant = "default" | "elevated" | "subtle";
export type GlassPadding = "none" | "sm" | "md" | "lg";
export type GlassRadius = keyof typeof radiusTokens;
export type GlowColor = "coral" | "violet" | "mint" | "none";

const variantClasses: Record<GlassVariant, string> = {
  default: "glass-panel",
  elevated: "glass-panel",
  subtle: "border border-white/[0.06] bg-void-800/30 backdrop-blur-md",
};

const glassPaddingClasses: Record<GlassPadding, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const glowClasses: Record<Exclude<GlowColor, "none">, string> = {
  coral: "shadow-glow-coral",
  violet: "shadow-glow-violet",
  mint: "shadow-glow-mint",
};

interface GlassPanelProps extends ComponentPropsWithoutRef<"div"> {
  as?: ElementType;
  variant?: GlassVariant;
  padding?: GlassPadding;
  radius?: GlassRadius;
  /** Soft colored glow shadow. Omit (or "none") for no glow — most panels shouldn't have one. */
  glow?: GlowColor;
  children: ReactNode;
}

export const GlassPanel = forwardRef<HTMLElement, GlassPanelProps>(
  ({ as: Component = "div", variant = "default", padding = "md", radius = "xl", glow = "none", className, style, children, ...props }, ref) => {
    const boxShadow = glow === "none" && variant === "elevated" ? shadowTokens.lg : undefined;

    return (
      <Component
        ref={ref}
        className={cn(variantClasses[variant], glassPaddingClasses[padding], glow !== "none" && glowClasses[glow], className)}
        style={{ borderRadius: radiusTokens[radius], ...(boxShadow ? { boxShadow } : {}), ...style } as CSSProperties}
        {...props}
      >
        {children}
      </Component>
    );
  },
);

GlassPanel.displayName = "GlassPanel";
