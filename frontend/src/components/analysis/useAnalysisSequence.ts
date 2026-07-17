import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";
import { easing } from "@/theme";

/**
 * useAnalysisSequence — drives the mock analysis timing. This is a
 * placeholder for what will eventually be real progress reported by the
 * backend (repository cloning, parsing, graph building) — the interface
 * (`progress`, `activeStageIndex`, `isComplete`) is shaped so swapping
 * this mock for real progress events later shouldn't require changing
 * any consuming component's props.
 *
 * Progress always completes once `active` is true, regardless of motion
 * preference — it's conveying real status ("did analysis finish"), not
 * decorative motion, so reduced-motion users still get the outcome; only
 * the *visual presentation* of each update (handled by the presentational
 * components) is what changes for them.
 */

interface UseAnalysisSequenceOptions {
  stageCount: number;
  /** Whether the sequence should be running. Resets to 0 when false. */
  active: boolean;
  totalDurationSeconds?: number;
  onComplete?: () => void;
}

interface UseAnalysisSequenceResult {
  /** 0–100. */
  progress: number;
  /** Index of the stage currently in progress. */
  activeStageIndex: number;
  isComplete: boolean;
}

const DEFAULT_DURATION_SECONDS = 6;

export function useAnalysisSequence({
  stageCount,
  active,
  totalDurationSeconds = DEFAULT_DURATION_SECONDS,
  onComplete,
}: UseAnalysisSequenceOptions): UseAnalysisSequenceResult {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!active) {
      setProgress(0);
      setIsComplete(false);
      return;
    }

    setIsComplete(false);
    const controls = animate(0, 100, {
      duration: totalDurationSeconds,
      ease: easing.standard,
      onUpdate: setProgress,
      onComplete: () => {
        setIsComplete(true);
        onCompleteRef.current?.();
      },
    });

    return () => controls.stop();
  }, [active, totalDurationSeconds]);

  const activeStageIndex = isComplete ? stageCount - 1 : Math.min(stageCount - 1, Math.floor((progress / 100) * stageCount));

  return { progress, activeStageIndex, isComplete };
}
