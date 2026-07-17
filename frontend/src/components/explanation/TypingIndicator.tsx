import { motion } from "framer-motion";
import { easing } from "@/theme";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * TypingIndicator — a brief "knowledge is being retrieved" cue shown for
 * a moment while AIExplanationPanel switches between nodes, before the
 * mock content appears. Three dots bounce in sequence; under reduced
 * motion they just sit at a steady dim opacity instead.
 */
export function TypingIndicator() {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div className="flex items-center gap-1.5 py-2" role="status" aria-label="Generating explanation">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="h-1.5 w-1.5 rounded-full bg-ink-faint"
          animate={reduceMotion ? { opacity: 0.5 } : { opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 1, repeat: Infinity, delay: index * 0.15, ease: easing.standard }
          }
        />
      ))}
    </div>
  );
}
