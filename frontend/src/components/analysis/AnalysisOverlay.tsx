import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PageContainer } from "@/layouts";
import { GradientButton } from "@/components/ui";
import { fadeIn, fadeUp } from "@/animations";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useApiRequest } from "@/hooks/useApiRequest";
import { ApiError, getKnowledge } from "@/services/api";
import { ANALYSIS_STAGES } from "./analysisStages";
import { useAnalysisSequence } from "./useAnalysisSequence";
import { AnalysisVisual } from "./AnalysisVisual";
import { AnalysisProgress } from "./AnalysisProgress";
import { AnalysisStage, type AnalysisStageStatus } from "./AnalysisStage";

/**
 * AnalysisOverlay — the full-screen experience between submitting a
 * repository URL and landing on the Repository Universe graph.
 *
 * The visual timing (progress bar, stage pulsing, constellation) is
 * entirely unchanged from the original mock — `useAnalysisSequence`
 * still drives a smooth ~6s animation exactly as before, since the
 * backend has no endpoint that reports fine-grained analysis progress.
 * What's real is layered underneath: while that animation plays, this
 * component also fetches GET /repository/{id}/knowledge (the call that
 * actually builds the Knowledge Model server-side — scan, parse,
 * dependency graph, all in one request). Completion now waits on *both*
 * signals (`isAnimationComplete && knowledge data received`), so the app
 * never moves on to a graph that isn't ready yet, whichever finishes
 * last. A real fetch failure shows an error with retry instead of
 * silently completing.
 */

interface AnalysisOverlayProps {
  open: boolean;
  repositoryId: string | null;
  onComplete?: (metadata?: { name: string; owner?: string }) => void;
  /** Called when the user cancels mid-analysis, or dismisses it once complete. */
  onClose?: () => void;
}

export function AnalysisOverlay({ open, repositoryId, onComplete, onClose }: AnalysisOverlayProps) {
  const reduceMotion = usePrefersReducedMotion();
  const { progress, activeStageIndex, isComplete: isAnimationComplete } = useAnalysisSequence({
    stageCount: ANALYSIS_STAGES.length,
    active: open,
    totalDurationSeconds: 6,
  });

  const knowledgeRequest = useApiRequest(
    (signal) => {
      if (!repositoryId) return Promise.reject(new ApiError("No repository to analyze.", 0));
      return getKnowledge(repositoryId, signal);
    },
    [repositoryId],
    { enabled: open && repositoryId !== null },
  );

  const isReady = isAnimationComplete && knowledgeRequest.data !== null;

  useEffect(() => {
    if (isReady) {
      const repoMeta = knowledgeRequest.data?.knowledge?.repository;
      onComplete?.(repoMeta ? { name: repoMeta.name, owner: repoMeta.owner } : undefined);
    }
    // onComplete intentionally omitted — only isReady's true→false/false→true transition should re-fire this, not identity changes of the callback prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  function statusFor(index: number): AnalysisStageStatus {
    if (isReady || index < activeStageIndex) return "complete";
    if (index === activeStageIndex) return "active";
    return "pending";
  }

  const currentStage = ANALYSIS_STAGES[activeStageIndex];
  const heading = knowledgeRequest.error ? "Analysis failed" : isReady ? "Analysis complete" : "Analyzing your repository";
  const statusMessage = knowledgeRequest.error ?? (isReady ? "Everything is mapped and ready." : currentStage?.label);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-void-950/85 p-6 backdrop-blur-md"
          variants={fadeIn({ reduceMotion })}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <PageContainer size="narrow">
            <motion.div
              className="flex flex-col items-center gap-10 text-center"
              variants={fadeUp({ reduceMotion, distance: 16 })}
              initial="hidden"
              animate="visible"
            >
              <AnalysisVisual stageCount={ANALYSIS_STAGES.length} statusFor={statusFor} />

              <div className="flex flex-col items-center gap-2">
                <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{heading}</h2>
                <p role="status" aria-live="polite" className="text-sm text-ink-dim">
                  {statusMessage}
                </p>
              </div>

              <div className="w-full max-w-md">
                <AnalysisProgress progress={progress} />
              </div>

              <div className="flex w-full max-w-md flex-col gap-3 text-left">
                {ANALYSIS_STAGES.map((stage, index) => (
                  <AnalysisStage key={stage.id} stage={stage} status={statusFor(index)} />
                ))}
              </div>

              <div className="flex items-center gap-3">
                {knowledgeRequest.error && (
                  <GradientButton variant="secondary" size="sm" onClick={knowledgeRequest.retry}>
                    Try again
                  </GradientButton>
                )}
                {onClose && (
                  <GradientButton variant="ghost" size="sm" onClick={onClose}>
                    {isReady ? "Close" : "Cancel"}
                  </GradientButton>
                )}
              </div>
            </motion.div>
          </PageContainer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
// import { AnimatePresence, motion } from "framer-motion";
// import { PageContainer } from "@/layouts";
// import { GradientButton } from "@/components/ui";
// import { fadeIn, fadeUp } from "@/animations";
// import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
// import { ANALYSIS_STAGES } from "./analysisStages";
// import { useAnalysisSequence } from "./useAnalysisSequence";
// import { AnalysisVisual } from "./AnalysisVisual";
// import { AnalysisProgress } from "./AnalysisProgress";
// import { AnalysisStage, type AnalysisStageStatus } from "./AnalysisStage";

// /**
//  * AnalysisOverlay — the full-screen experience between submitting a
//  * repository URL and (in a future milestone) landing on the Repository
//  * Universe graph. Mock timing only — see useAnalysisSequence for the
//  * placeholder that real backend progress will eventually replace.
//  *
//  * The backdrop dims and blurs rather than fully occluding, so the
//  * AnimatedBackground already mounted behind the whole app stays faintly
//  * visible through it — the overlay is a continuation of the same "living
//  * universe" atmosphere, not a separate, unrelated loading screen.
//  */

// interface AnalysisOverlayProps {
//   open: boolean;
//   onComplete?: () => void;
//   /** Called when the user cancels mid-analysis, or dismisses it once complete. */
//   onClose?: () => void;
// }

// export function AnalysisOverlay({ open, onComplete, onClose }: AnalysisOverlayProps) {
//   const reduceMotion = usePrefersReducedMotion();
//   const { progress, activeStageIndex, isComplete } = useAnalysisSequence({
//     stageCount: ANALYSIS_STAGES.length,
//     active: open,
//     totalDurationSeconds: 6,
//     onComplete,
//   });

//   function statusFor(index: number): AnalysisStageStatus {
//     if (isComplete || index < activeStageIndex) return "complete";
//     if (index === activeStageIndex) return "active";
//     return "pending";
//   }

//   const currentStage = ANALYSIS_STAGES[activeStageIndex];

//   return (
//     <AnimatePresence>
//       {open && (
//         <motion.div
//           className="fixed inset-0 z-40 flex items-center justify-center bg-void-950/85 p-6 backdrop-blur-md"
//           variants={fadeIn({ reduceMotion })}
//           initial="hidden"
//           animate="visible"
//           exit="hidden"
//         >
//           <PageContainer size="narrow">
//             <motion.div
//               className="flex flex-col items-center gap-10 text-center"
//               variants={fadeUp({ reduceMotion, distance: 16 })}
//               initial="hidden"
//               animate="visible"
//             >
//               <AnalysisVisual stageCount={ANALYSIS_STAGES.length} statusFor={statusFor} />

//               <div className="flex flex-col items-center gap-2">
//                 <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
//                   {isComplete ? "Analysis complete" : "Analyzing your repository"}
//                 </h2>
//                 <p role="status" aria-live="polite" className="text-sm text-ink-dim">
//                   {isComplete ? "Everything is mapped and ready." : currentStage?.label}
//                 </p>
//               </div>

//               <div className="w-full max-w-md">
//                 <AnalysisProgress progress={progress} />
//               </div>

//               <div className="flex w-full max-w-md flex-col gap-3 text-left">
//                 {ANALYSIS_STAGES.map((stage, index) => (
//                   <AnalysisStage key={stage.id} stage={stage} status={statusFor(index)} />
//                 ))}
//               </div>

//               {onClose && (
//                 <GradientButton variant="ghost" size="sm" onClick={onClose}>
//                   {isComplete ? "Close" : "Cancel"}
//                 </GradientButton>
//               )}
//             </motion.div>
//           </PageContainer>
//         </motion.div>
//       )}
//     </AnimatePresence>
//   );
// }
