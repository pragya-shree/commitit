import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { useMagneticHover } from "@/animations";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { gradients, duration, easing, transition as motionTransition } from "@/theme";

/**
 * GradientButton — the primary call-to-action primitive. `primary` is a
 * warm-gradient filled pill with a constant subtle glow; `secondary` is a
 * glass surface; `ghost` is bare text that picks up a faint background on
 * hover. All three share the same magnetic-hover + press-scale
 * micro-interactions so the *feel* is consistent regardless of visual
 * weight.
 */

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type NativeButtonProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
>;

interface GradientButtonProps extends NativeButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  children: ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-6 text-base gap-2",
  lg: "h-14 px-8 text-lg gap-2.5",
};

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: "h-4 w-4",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "text-void-950 font-semibold shadow-glow-coral",
  secondary: "glass-panel text-ink font-medium hover:bg-void-700/40",
  ghost: "text-ink-dim font-medium hover:text-ink hover:bg-white/5",
};

export const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  (
    { variant = "primary", size = "md", loading = false, disabled, leftIcon: LeftIcon, rightIcon: RightIcon, className, children, ...props },
    ref,
  ) => {
    const reduceMotion = usePrefersReducedMotion();
    const { ref: magneticRef, x, y, onMouseMove, onMouseLeave } = useMagneticHover<HTMLButtonElement>({ strength: 0.3, max: 10 });
    const isDisabled = disabled || loading;

    function setRefs(node: HTMLButtonElement | null) {
      magneticRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }

    return (
      <motion.button
        ref={setRefs}
        type="button"
        disabled={isDisabled}
        aria-busy={loading || undefined}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{
          x,
          y,
          backgroundImage: variant === "primary" ? gradients.warm : undefined,
        }}
        whileHover={!reduceMotion && !isDisabled ? { scale: 1.02 } : undefined}
        whileTap={!reduceMotion && !isDisabled ? { scale: 0.96 } : undefined}
        transition={motionTransition.springSnappy}
        className={cn(
          "relative inline-flex items-center justify-center rounded-full transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading && (
          <motion.span
            className="inline-flex"
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={reduceMotion ? undefined : { duration: duration.slower, repeat: Infinity, ease: easing.linear }}
          >
            <Loader2 className={iconSizeClasses[size]} aria-hidden="true" />
          </motion.span>
        )}
        {!loading && LeftIcon && <LeftIcon className={iconSizeClasses[size]} aria-hidden="true" />}
        <span>{children}</span>
        {!loading && RightIcon && <RightIcon className={iconSizeClasses[size]} aria-hidden="true" />}
      </motion.button>
    );
  },
);

GradientButton.displayName = "GradientButton";
