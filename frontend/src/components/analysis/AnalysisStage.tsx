import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { pulseGlow } from "@/animations";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { AnalysisStageConfig } from "./analysisStages";

/**
 * AnalysisStage — a single row in the stage checklist: pending (dim,
 * outlined icon), active (bright, pulsing icon + label), or complete
 * (settled mint checkmark). Only the active state uses continuous motion
 * (`pulseGlow`) — pending/complete are static, so the list doesn't turn
 * into a wall of simultaneous animation.
 */

export type AnalysisStageStatus = "pending" | "active" | "complete";

interface AnalysisStageProps {
  stage: AnalysisStageConfig;
  status: AnalysisStageStatus;
}

const statusTextClasses: Record<AnalysisStageStatus, string> = {
  pending: "text-ink-faint",
  active: "text-ink",
  complete: "text-ink-dim",
};

export function AnalysisStage({ stage, status }: AnalysisStageProps) {
  const reduceMotion = usePrefersReducedMotion();
  const Icon = stage.icon;

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
          status === "pending" && "border-white/10 text-ink-faint",
          status === "active" && "border-coral/40 text-coral",
          status === "complete" && "border-mint/40 text-mint",
        )}
      >
        {status === "complete" ? (
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        ) : status === "active" ? (
          <motion.span
            className="flex"
            {...pulseGlow({ minOpacity: 0.6, maxOpacity: 1, scaleRange: [0.9, 1.08], duration: 1.6, reduceMotion })}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </motion.span>
        ) : (
          <Icon className="h-4 w-4" aria-hidden="true" />
        )}
      </div>

      <span className={cn("text-sm transition-colors", statusTextClasses[status])}>{stage.label}</span>
    </div>
  );
}
