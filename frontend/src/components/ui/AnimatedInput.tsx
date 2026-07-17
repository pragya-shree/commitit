import { forwardRef, useId, useState, type ComponentPropsWithoutRef, type FocusEvent } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { GlassPanel } from "@/layouts";
import { brand, radius as radiusTokens, transition as motionTransition } from "@/theme";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * AnimatedInput — a labeled text input on a glass surface with a
 * state-aware animated ring instead of the browser's default focus
 * outline. The ring is persistent (not just on-focus) for `error`/
 * `success` states, so validation stays visible even after the field
 * loses focus; for the neutral `default` state it only appears while
 * focused, using violet to stay visually distinct from the error
 * (coral) and success (mint) colors.
 *
 * The native outline is intentionally suppressed in favor of this ring —
 * WCAG requires *a* visible focus indicator, not specifically the
 * browser default, and the ring is visible for both pointer and keyboard
 * focus, so this remains fully accessible.
 */

type InputState = "default" | "error" | "success";
type InputSize = "sm" | "md" | "lg";

type NativeInputProps = Omit<ComponentPropsWithoutRef<"input">, "size">;

interface AnimatedInputProps extends NativeInputProps {
  label?: string;
  /** Shown below the field; color/icon follow `state`. */
  helperText?: string;
  state?: InputState;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  inputSize?: InputSize;
}

const sizeClasses: Record<InputSize, string> = {
  sm: "h-9 px-3 text-sm gap-2",
  md: "h-11 px-4 text-base gap-2.5",
  lg: "h-14 px-5 text-lg gap-3",
};

const iconSizeClasses: Record<InputSize, string> = {
  sm: "h-4 w-4",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

const helperTextClasses: Record<InputState, string> = {
  default: "text-ink-faint",
  error: "text-coral",
  success: "text-mint",
};

export const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  (
    {
      label,
      helperText,
      state = "default",
      leadingIcon: LeadingIcon,
      trailingIcon: TrailingIcon,
      inputSize = "md",
      disabled,
      className,
      id: idProp,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const reduceMotion = usePrefersReducedMotion();
    const [isFocused, setIsFocused] = useState(false);
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const helperId = helperText ? `${id}-helper` : undefined;

    function handleFocus(event: FocusEvent<HTMLInputElement>) {
      setIsFocused(true);
      onFocus?.(event);
    }

    function handleBlur(event: FocusEvent<HTMLInputElement>) {
      setIsFocused(false);
      onBlur?.(event);
    }

    const ringColor = state === "error" ? brand.coral : state === "success" ? brand.mint : isFocused ? brand.violet : null;

    const HelperIcon = state === "error" ? AlertCircle : state === "success" ? CheckCircle2 : null;

    return (
      <div className={cn("flex w-full flex-col gap-1.5", disabled && "opacity-50", className)}>
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-ink-dim">
            {label}
          </label>
        )}

        <div className="relative">
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ borderRadius: radiusTokens.lg, border: `2px solid ${ringColor ?? "transparent"}` }}
            initial={false}
            animate={{ opacity: ringColor ? 1 : 0, scale: ringColor ? 1 : 0.98 }}
            transition={reduceMotion ? { duration: 0 } : motionTransition.fast}
          />

          <GlassPanel
            as="div"
            variant="subtle"
            padding="none"
            radius="lg"
            className={cn("flex items-center", sizeClasses[inputSize])}
          >
            {LeadingIcon && <LeadingIcon className={cn(iconSizeClasses[inputSize], "shrink-0 text-ink-faint")} aria-hidden="true" />}
            <input
              ref={ref}
              id={id}
              disabled={disabled}
              aria-invalid={state === "error" || undefined}
              aria-describedby={helperId}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="min-w-0 flex-1 bg-transparent font-body text-ink placeholder:text-ink-faint outline-none disabled:cursor-not-allowed"
              {...props}
            />
            {TrailingIcon && <TrailingIcon className={cn(iconSizeClasses[inputSize], "shrink-0 text-ink-faint")} aria-hidden="true" />}
          </GlassPanel>
        </div>

        {helperText && (
          <p id={helperId} className={cn("flex items-center gap-1.5 text-xs", helperTextClasses[state])}>
            {HelperIcon && <HelperIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

AnimatedInput.displayName = "AnimatedInput";
