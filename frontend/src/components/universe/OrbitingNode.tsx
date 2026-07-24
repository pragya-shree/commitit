import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { transition as motionTransition } from "@/theme";
import { floating } from "@/animations";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { NodeLabel } from "./NodeLabel";
import type { NodeVisualState, RepositoryNodeData } from "./types";

interface OrbitingNodeProps {
  node: RepositoryNodeData;
  position: { x: number; y: number };
  state: NodeVisualState;
  selected?: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onSelect?: () => void;
}

function floatSeedFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 997;
  }
  return hash / 997;
}

export const OrbitingNode = React.memo(function OrbitingNode({
  node,
  position,
  state,
  selected = false,
  onHoverStart,
  onHoverEnd,
  onSelect,
}: OrbitingNodeProps) {
  const reduceMotion = usePrefersReducedMotion();
  const Icon = node.icon;
  const floatSeed = floatSeedFromId(node.id);

  const isHighlighted = state === "hovered" || state === "related";

  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{ transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))` }}
    >
      <motion.div
        className="flex flex-col items-center gap-2"
        {...floating({ distance: 6, duration: 5 + floatSeed * 2, delay: floatSeed * 2, reduceMotion })}
      >
        <div className="relative">
          {/* Hardware-accelerated GPU opacity glow layer to avoid box-shadow repaints */}
          <div
            className="absolute inset-0 rounded-full transition-opacity duration-300 pointer-events-none"
            style={{
              opacity: isHighlighted ? 1 : 0,
              boxShadow: `0 0 24px ${node.color}80`,
            }}
          />
          <motion.button
            type="button"
            onClick={onSelect}
            onHoverStart={onHoverStart}
            onHoverEnd={onHoverEnd}
            onFocus={onHoverStart}
            onBlur={onHoverEnd}
            whileHover={!reduceMotion ? { scale: 1.12 } : undefined}
            whileTap={!reduceMotion ? { scale: 0.96 } : undefined}
            transition={motionTransition.springSnappy}
            aria-label={`${node.label}${node.meta ? `, ${node.meta}` : ""}`}
            aria-pressed={selected}
            className={cn(
              "relative flex h-16 w-16 items-center justify-center rounded-full border backdrop-blur-md transition-opacity duration-300",
              state === "dimmed" ? "opacity-40" : "opacity-100"
            )}
            style={{
              borderColor: `${node.color}55`,
              backgroundColor: `${node.color}1f`,
            }}
          >
            <Icon className="h-6 w-6" style={{ color: node.color }} aria-hidden="true" />
          </motion.button>
        </div>

        <NodeLabel label={node.label} meta={node.meta} state={state} />
      </motion.div>
    </div>
  );
});
