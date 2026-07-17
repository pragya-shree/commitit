import { forwardRef, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { staggerItem } from "@/animations";
import { transition as motionTransition } from "@/theme";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { GlassPanel, type GlassPadding, type GlassRadius, type GlassVariant, type GlowColor } from "./GlassPanel";
import { GradientBorder } from "./GradientBorder";

/**
 * AnimatedCard — the default "premium glass card" primitive: a
 * GlassPanel surface with a subtle hover lift and an entrance animation
 * that plugs straight into a `staggerContainer` (e.g. a grid of cards
 * that should reveal one after another). Optionally wraps the surface in
 * a GradientBorder for a standout card.
 *
 * This composes the three primitives above rather than reimplementing
 * any of their styling — GradientBorder just wraps a GlassPanel; there's
 * no separate "gradient-border padding" logic to keep in sync.
 *
 * Purely structural/visual — no card *content* opinions (no title/body/
 * footer slots). That's deliberately left to application-specific
 * components built on top of this in a later milestone.
 *
 * Accessibility note: this component doesn't add its own interactivity
 * (no forced role/tabIndex) — if a card should be a link or button,
 * render it `as="a"` or `as="button"` and it inherits native keyboard
 * support plus the app-wide `:focus-visible` ring for free.
 */

interface AnimatedCardProps extends Omit<ComponentPropsWithoutRef<"div">, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"> {
  /** Element the inner surface renders as — e.g. "article", "a", "button". Defaults to "div". */
  as?: ElementType;
  variant?: GlassVariant;
  padding?: GlassPadding;
  radius?: GlassRadius;
  glow?: GlowColor;
  /** Wrap the surface in an animated-capable gradient ring instead of a plain glass border. */
  gradientBorder?: boolean;
  /** Lift slightly on hover. Default true; automatically disabled under reduced motion. */
  hoverLift?: boolean;
  children: ReactNode;
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  (
    {
      as = "div",
      variant = "default",
      padding = "lg",
      radius = "xl",
      glow = "none",
      gradientBorder = false,
      hoverLift = true,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const reduceMotion = usePrefersReducedMotion();

    const surface = (
      <GlassPanel as={as} variant={variant} padding={padding} radius={radius} glow={gradientBorder ? "none" : glow} className="h-full w-full">
        {children}
      </GlassPanel>
    );

    return (
      <motion.div
        ref={ref}
        variants={staggerItem({ reduceMotion })}
        whileHover={hoverLift && !reduceMotion ? { y: -6 } : undefined}
        transition={motionTransition.springSnappy}
        className={cn("h-full", className)}
        {...props}
      >
        {gradientBorder ? (
          <GradientBorder radius={radius} className="h-full">
            {surface}
          </GradientBorder>
        ) : (
          surface
        )}
      </motion.div>
    );
  },
);

AnimatedCard.displayName = "AnimatedCard";
