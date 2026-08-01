import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderGit2, Flame } from "lucide-react";
import { cn } from "@/utils/cn";
import { gradients, transition as motionTransition } from "@/theme";
import { pulseGlow } from "@/animations";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { NodeLabel } from "./NodeLabel";
import type { NodeVisualState } from "./types";
import type { NodeHeatMapMetrics } from "./HeatMap/heatMapEngine";

interface RepositoryNodeProps {
  label: string;
  meta?: string;
  state: NodeVisualState;
  selected?: boolean;
  heatMapMetrics?: NodeHeatMapMetrics | null;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onSelect?: () => void;
}

export const RepositoryNode = React.memo(function RepositoryNode({
  label,
  meta,
  state,
  selected = false,
  heatMapMetrics = null,
  onHoverStart,
  onHoverEnd,
  onSelect,
}: RepositoryNodeProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 z-20">
      <div className="relative">
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
            "relative flex h-24 w-24 items-center justify-center rounded-full transition-opacity duration-300 cursor-pointer",
            state === "dimmed" ? "opacity-40" : "opacity-100"
          )}
        >
          <motion.span
            className="absolute inset-0 rounded-full transition-colors duration-300"
            style={{
              backgroundImage: heatMapMetrics
                ? `radial-gradient(circle, ${heatMapMetrics.color} 0%, #1e1b4b 100%)`
                : gradients.warm,
            }}
            {...pulseGlow({ minOpacity: 0.75, maxOpacity: 1, scaleRange: [0.97, 1.08], duration: 3, reduceMotion })}
          />
          <FolderGit2 className="relative h-8 w-8 text-void-950" aria-hidden="true" />
        </motion.button>

        {/* Heat Map Metric Hover Tooltip for Root */}
        <AnimatePresence>
          {state === "hovered" && heatMapMetrics && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute left-1/2 bottom-full mb-3 -translate-x-1/2 z-50 pointer-events-none w-60 p-3.5 rounded-2xl border border-white/15 bg-void-950/95 backdrop-blur-xl shadow-[0_16px_36px_rgba(0,0,0,0.85)] flex flex-col gap-2"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Flame className="h-3.5 w-3.5 text-coral shrink-0" />
                  <span className="font-bold font-display text-xs text-ink truncate">
                    Workspace Root
                  </span>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase bg-coral/20 text-coral border border-coral/30">
                  ROOT HUB
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                <div className="flex flex-col p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                  <span className="text-slate-400">Total Files</span>
                  <span className="font-bold text-slate-200">{heatMapMetrics.fileCount}</span>
                </div>
                <div className="flex flex-col p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                  <span className="text-slate-400">Total Symbols</span>
                  <span className="font-bold text-slate-200">{heatMapMetrics.symbolCount}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <NodeLabel label={label} meta={meta} state={state} />
    </div>
  );
});
