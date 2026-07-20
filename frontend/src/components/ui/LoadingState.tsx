import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { easing } from "@/theme";

/**
 * LoadingState — a small, consistent "fetching from the backend" notice
 * reused everywhere a screen waits on a real API call (UniversePage,
 * DashboardPage, AIExplanationPanel's body, etc). Framer-driven rotation
 * (not Tailwind's `animate-spin`) so it can respect
 * `usePrefersReducedMotion()` the same way every other continuous
 * animation in this app does — frozen, not spinning, for reduced-motion
 * users.
 */

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading…" }: LoadingStateProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center" role="status" aria-live="polite">
      <motion.span
        className="flex"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={reduceMotion ? undefined : { duration: 1, repeat: Infinity, ease: easing.linear }}
      >
        <Loader2 className="h-6 w-6 text-ink-faint" aria-hidden="true" />
      </motion.span>
      <p className="max-w-sm text-sm text-ink-dim">{message}</p>
    </div>
  );
}