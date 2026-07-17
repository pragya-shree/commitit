import { motion } from "framer-motion";
import { gradients } from "@/theme";

/**
 * AnalysisProgress — the overall progress bar. The fill animates via
 * `scaleX` with `transform-origin: left` rather than animating `width`
 * directly — `scaleX` is a composited transform (GPU, no layout
 * recalculation per frame); animating `width` would force layout on
 * every update, which matters here since progress updates every frame
 * for several seconds straight.
 */

interface AnalysisProgressProps {
  /** 0–100. */
  progress: number;
}

export function AnalysisProgress({ progress }: AnalysisProgressProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className="flex w-full flex-col gap-2">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className="h-full origin-left rounded-full"
          style={{ backgroundImage: gradients.warm, scaleX: clamped / 100 }}
        />
      </div>
      <span className="self-end font-mono text-xs text-ink-faint">{Math.round(clamped)}%</span>
    </div>
  );
}
