import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { transition as motionTransition } from "@/theme";
import { floating } from "@/animations";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { NodeLabel } from "./NodeLabel";
import type { NodeVisualState, RepositoryNodeData } from "./types";

/**
 * OrbitingNode — a single folder node: a glass circle (icon + brand
 * color) with its label underneath, gently bobbing in place, that
 * highlights on hover/focus and reports that hover up to
 * RepositoryUniverse via callbacks (it has no idea what "related" means,
 * only the `state` it's told to render).
 *
 * Positioning is deliberately split across two nested elements: an outer
 * plain `div` holds the static computed position (baked into one
 * `transform: translate(calc(...))` string), and an inner `motion.div`
 * owns only the floating bob. Combining a static position and a
 * Framer-driven `y` animation on the *same* element would fight over the
 * `transform` property — Framer would overwrite the static offset every
 * frame. Splitting them avoids that entirely (the same pattern
 * FloatingParticles uses).
 *
 * `floatSeed`, derived deterministically from the node's id (not
 * `Math.random()`), varies each node's float duration/delay slightly so
 * a ring of nodes doesn't bob in perfect, obviously-artificial unison.
 */

interface OrbitingNodeProps {
  node: RepositoryNodeData;
  position: { x: number; y: number };
  state: NodeVisualState;
  /** Whether this node is the currently (persistently) selected one — distinct from `state`, which also reflects transient hover. */
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

export function OrbitingNode({ node, position, state, selected = false, onHoverStart, onHoverEnd, onSelect }: OrbitingNodeProps) {
  const reduceMotion = usePrefersReducedMotion();
  const Icon = node.icon;
  const floatSeed = floatSeedFromId(node.id);

  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{ transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))` }}
    >
      <motion.div
        className="flex flex-col items-center gap-2"
        {...floating({ distance: 6, duration: 5 + floatSeed * 2, delay: floatSeed * 2, reduceMotion })}
      >
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
            "flex h-16 w-16 items-center justify-center rounded-full border backdrop-blur-md transition-[opacity,box-shadow] duration-300",
            state === "dimmed" ? "opacity-40" : "opacity-100",
          )}
          style={{
            borderColor: `${node.color}55`,
            backgroundColor: `${node.color}1f`,
            boxShadow: state === "hovered" || state === "related" ? `0 0 24px ${node.color}80` : "none",
          }}
        >
          <Icon className="h-6 w-6" style={{ color: node.color }} aria-hidden="true" />
        </motion.button>

        <NodeLabel label={node.label} meta={node.meta} state={state} />
      </motion.div>
    </div>
  );
}
