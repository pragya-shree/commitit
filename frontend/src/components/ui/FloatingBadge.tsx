import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { floating } from "@/animations";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * FloatingBadge — a small pill for labels, status indicators, and tags.
 * Deliberately un-opinionated about semantics (no built-in "success"/
 * "warning" naming) — `color` just names a palette color, and callers
 * decide what it means in context.
 *
 * `floatDelay` exists so multiple badges in a row can bob slightly out of
 * phase with each other instead of moving in perfect unison, which reads
 * as noticeably more artificial.
 */

type BadgeColor = "coral" | "amber" | "magenta" | "violet" | "mint" | "cyan" | "neutral";
type BadgeSize = "compact" | "large";

type NativeSpanProps = Omit<
  ComponentPropsWithoutRef<"span">,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
>;

interface FloatingBadgeProps extends NativeSpanProps {
  icon?: LucideIcon;
  color?: BadgeColor;
  size?: BadgeSize;
  /** Subtle continuous vertical bob. Default true. */
  float?: boolean;
  /** Stagger the float animation's start, in seconds — use for badges shown together. */
  floatDelay?: number;
  children: ReactNode;
}

const colorClasses: Record<BadgeColor, string> = {
  coral: "border-coral/30 bg-coral/15 text-coral",
  amber: "border-amber/30 bg-amber/15 text-amber",
  magenta: "border-magenta/30 bg-magenta/15 text-magenta",
  violet: "border-violet/30 bg-violet/15 text-violet",
  mint: "border-mint/30 bg-mint/15 text-mint",
  cyan: "border-cyan/30 bg-cyan/15 text-cyan",
  neutral: "border-white/10 bg-white/5 text-ink-dim",
};

const sizeClasses: Record<BadgeSize, string> = {
  compact: "h-6 gap-1 px-2.5 text-xs",
  large: "h-8 gap-1.5 px-3.5 text-sm",
};

const iconSizeClasses: Record<BadgeSize, string> = {
  compact: "h-3 w-3",
  large: "h-3.5 w-3.5",
};

export function FloatingBadge({
  icon: Icon,
  color = "coral",
  size = "compact",
  float = true,
  floatDelay = 0,
  className,
  children,
  ...props
}: FloatingBadgeProps) {
  const reduceMotion = usePrefersReducedMotion();
  const floatProps = float ? floating({ distance: 4, duration: 5, delay: floatDelay, reduceMotion }) : {};

  return (
    <motion.span
      className={cn(
        "inline-flex w-fit items-center rounded-full border font-medium backdrop-blur-sm",
        colorClasses[color],
        sizeClasses[size],
        className,
      )}
      {...floatProps}
      {...props}
    >
      {Icon && <Icon className={cn(iconSizeClasses[size], "shrink-0")} aria-hidden="true" />}
      {children}
    </motion.span>
  );
}
