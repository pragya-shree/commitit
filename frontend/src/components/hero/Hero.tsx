// import { useState } from "react";
// import { Globe2, Lock, Sparkles, Zap } from "lucide-react";
// import { Section } from "@/layouts";
// import { FloatingBadge, SectionHeading } from "@/components/ui";
// import { AnalysisOverlay } from "@/components/analysis";
// import { RepositoryUrlForm } from "./RepositoryUrlForm";
// import { HeroVisual } from "./HeroVisual";

// /**
//  * Hero — the CommitIt landing experience. Composed entirely from
//  * existing primitives (Section, SectionHeading, FloatingBadge,
//  * RepositoryUrlForm, HeroVisual, AnalysisOverlay) — no new styling
//  * primitives introduced here, only application-specific content and
//  * layout.
//  *
//  * Layout: a single centered column on mobile/tablet; a two-column grid
//  * (text left, HeroVisual right) from `lg` up. The grid approach — rather
//  * than absolutely positioning HeroVisual to one side — was chosen
//  * because Section nests children inside PageContainer's width-constrained
//  * box, so there's no full-viewport-width ancestor to usefully position
//  * an absolutely-placed element against; a grid column keeps HeroVisual
//  * correctly constrained and responsive with zero extra plumbing.
//  *
//  * `isAnalyzing` is owned here (not inside RepositoryUrlForm) since
//  * AnalysisOverlay is a sibling of the form, not a descendant — the form
//  * only decides *when* to open it via `onAnalyze`.
//  *
//  * `onAnalysisComplete` is forwarded to AnalysisOverlay's `onComplete` —
//  * Hero itself has no opinion on what happens after analysis finishes
//  * (that's the caller's call, e.g. switching to RepositoryUniverse).
//  */

// const trustBadges = [
//   { icon: Zap, label: "Fast analysis", color: "amber" as const, floatDelay: 0 },
//   { icon: Lock, label: "Privacy-first", color: "mint" as const, floatDelay: 0.3 },
//   { icon: Sparkles, label: "Smart AI", color: "violet" as const, floatDelay: 0.6 },
//   { icon: Globe2, label: "Open source", color: "cyan" as const, floatDelay: 0.9 },
// ];

// interface HeroProps {
//   onAnalysisComplete?: () => void;
// }

// export function Hero({ onAnalysisComplete }: HeroProps) {
//   const [isAnalyzing, setIsAnalyzing] = useState(false);

//   return (
//     <>
//       <Section spacing="lg" containerSize="wide" className="relative z-10 flex min-h-screen items-center">
//         <div className="grid w-full items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
//           <div className="flex flex-col items-center gap-8 text-center lg:items-start lg:text-left">
//             <FloatingBadge icon={Sparkles} color="coral" size="large">
//               AI-Powered Code Intelligence
//             </FloatingBadge>

//             <SectionHeading
//               titleAs="h1"
//               align="center"
//               className="lg:items-start lg:text-left"
//               title={
//                 <>
//                   Understand Any <span className="text-gradient-warm">Codebase</span>
//                 </>
//               }
//               subtitle="Paste a GitHub repository and watch CommitIt build a living map of every file, function, and connection inside it — then ask it anything."
//             />

//             <div className="w-full max-w-2xl">
//               <RepositoryUrlForm onAnalyze={() => setIsAnalyzing(true)} />
//             </div>

//             <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
//               {trustBadges.map(({ icon, label, color, floatDelay }) => (
//                 <FloatingBadge key={label} icon={icon} color={color} size="compact" floatDelay={floatDelay}>
//                   {label}
//                 </FloatingBadge>
//               ))}
//             </div>
//           </div>

//           <div className="hidden justify-center lg:flex">
//             <HeroVisual />
//           </div>
//         </div>
//       </Section>

//       <AnalysisOverlay open={isAnalyzing} onComplete={onAnalysisComplete} onClose={() => setIsAnalyzing(false)} />
//     </>
//   );
// }

import { useEffect, useRef, useState } from "react";
import { Globe2, Lock, Sparkles, Zap } from "lucide-react";
import { Section } from "@/layouts";
import { FloatingBadge, SectionHeading } from "@/components/ui";
import { AnalysisOverlay } from "@/components/analysis";
import { useApiRequest } from "@/hooks/useApiRequest";
import { ApiError, cloneRepository } from "@/services/api";
import { RepositoryUrlForm } from "./RepositoryUrlForm";
import { HeroVisual } from "./HeroVisual";

/**
 * Hero — the CommitIt landing experience. Composed entirely from
 * existing primitives (Section, SectionHeading, FloatingBadge,
 * RepositoryUrlForm, HeroVisual, AnalysisOverlay) — no new styling
 * primitives introduced here, only application-specific content and
 * layout.
 *
 * Layout: a single centered column on mobile/tablet; a two-column grid
 * (text left, HeroVisual right) from `lg` up. The grid approach — rather
 * than absolutely positioning HeroVisual to one side — was chosen
 * because Section nests children inside PageContainer's width-constrained
 * box, so there's no full-viewport-width ancestor to usefully position
 * an absolutely-placed element against; a grid column keeps HeroVisual
 * correctly constrained and responsive with zero extra plumbing.
 *
 * `isAnalyzing` is owned here (not inside RepositoryUrlForm) since
 * AnalysisOverlay is a sibling of the form, not a descendant — the form
 * only decides *when* to open it via `onAnalyze`.
 *
 * Backend integration: Hero owns the real POST /repository/clone
 * request. `pendingClone` (url + a monotonic token) is the reactive
 * trigger for `useApiRequest` — the token guarantees a request re-fires
 * even if the exact same URL is resubmitted after a cancel, since the
 * hook only re-runs when its dependencies actually change. On success,
 * `repositoryId` is stored and handed to AnalysisOverlay; on failure,
 * the error flows back down into RepositoryUrlForm through the same
 * error-state UI a client-side validation failure already used.
 */

const trustBadges = [
  { icon: Zap, label: "Fast analysis", color: "amber" as const, floatDelay: 0 },
  { icon: Lock, label: "Privacy-first", color: "mint" as const, floatDelay: 0.3 },
  { icon: Sparkles, label: "Smart AI", color: "violet" as const, floatDelay: 0.6 },
  { icon: Globe2, label: "Open source", color: "cyan" as const, floatDelay: 0.9 },
];

interface HeroProps {
  onAnalysisComplete?: (repositoryId: string) => void;
}

export function Hero({ onAnalysisComplete }: HeroProps) {
  const [pendingClone, setPendingClone] = useState<{ url: string; token: number } | null>(null);
  const [repositoryId, setRepositoryId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const submitTokenRef = useRef(0);

  const cloneRequest = useApiRequest(
    (signal) => {
      if (!pendingClone) return Promise.reject(new ApiError("No repository URL submitted.", 0));
      return cloneRepository(pendingClone.url, signal);
    },
    [pendingClone?.url, pendingClone?.token],
    { enabled: pendingClone !== null },
  );

  useEffect(() => {
    if (!cloneRequest.data) return;
    setRepositoryId(cloneRequest.data.repository_id);
    setIsAnalyzing(true);
    setPendingClone(null);
  }, [cloneRequest.data]);

  function handleAnalyzeRequest(url: string) {
    submitTokenRef.current += 1;
    setPendingClone({ url, token: submitTokenRef.current });
  }

  function handleAnalysisComplete() {
    if (repositoryId) onAnalysisComplete?.(repositoryId);
  }

  return (
    <>
      <Section spacing="lg" containerSize="wide" className="relative z-10 flex min-h-screen items-center">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col items-center gap-8 text-center lg:items-start lg:text-left">
            <FloatingBadge icon={Sparkles} color="coral" size="large">
              AI-Powered Code Intelligence
            </FloatingBadge>

            <SectionHeading
              titleAs="h1"
              align="center"
              className="lg:items-start lg:text-left"
              title={
                <>
                  Understand Any <span className="text-gradient-warm">Codebase</span>
                </>
              }
              subtitle="Paste a GitHub repository and watch CommitIt build a living map of every file, function, and connection inside it — then ask it anything."
            />

            <div className="w-full max-w-2xl">
              <RepositoryUrlForm
                onAnalyze={handleAnalyzeRequest}
                cloneLoading={cloneRequest.loading}
                cloneError={cloneRequest.error}
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              {trustBadges.map(({ icon, label, color, floatDelay }) => (
                <FloatingBadge key={label} icon={icon} color={color} size="compact" floatDelay={floatDelay}>
                  {label}
                </FloatingBadge>
              ))}
            </div>
          </div>

          <div className="hidden justify-center lg:flex">
            <HeroVisual />
          </div>
        </div>
      </Section>

      <AnalysisOverlay
        open={isAnalyzing}
        repositoryId={repositoryId}
        onComplete={handleAnalysisComplete}
        onClose={() => setIsAnalyzing(false)}
      />
    </>
  );
}