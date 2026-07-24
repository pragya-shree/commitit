import React from "react";
import { motion } from "framer-motion";
import { FolderGit2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { gradients, transition as motionTransition } from "@/theme";
import { pulseGlow } from "@/animations";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { NodeLabel } from "./NodeLabel";
import type { NodeVisualState } from "./types";

interface RepositoryNodeProps {
  label: string;
  meta?: string;
  state: NodeVisualState;
  selected?: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onSelect?: () => void;
}

export const RepositoryNode = React.memo(function RepositoryNode({
  label,
  meta,
  state,
  selected = false,
  onHoverStart,
  onHoverEnd,
  onSelect,
}: RepositoryNodeProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3">
      <motion.button
        type="button"
        onClick={onSelect}
        onHoverStart={onHoverStart}
        onHoverEnd={onHoverEnd}
        onFocus={onHoverStart}
        onBlur={onHoverEnd}
        whileHover={!reduceMotion ? { scale: 1.06 } : undefined}
        whileTap={!reduceMotion ? { scale: 0.97 } : undefined}
        transition={motionTransition.springSnappy}
        aria-label={`${label}, repository root${meta ? `, ${meta}` : ""}`}
        aria-pressed={selected}
        className={cn(
          "relative flex h-24 w-24 items-center justify-center rounded-full transition-opacity duration-300",
          state === "dimmed" ? "opacity-40" : "opacity-100"
        )}
      >
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ backgroundImage: gradients.warm }}
          {...pulseGlow({ minOpacity: 0.75, maxOpacity: 1, scaleRange: [0.97, 1.08], duration: 3, reduceMotion })}
        />
        <FolderGit2 className="relative h-8 w-8 text-void-950" aria-hidden="true" />
      </motion.button>

      <NodeLabel label={label} meta={meta} state={state} />
    </div>
  );
});
