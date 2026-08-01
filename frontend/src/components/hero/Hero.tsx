import { useState, useEffect, useRef } from "react";
import { Globe2, Lock, Sparkles, Zap } from "lucide-react";
import { Section } from "@/layouts";
import { FloatingBadge, SectionHeading } from "@/components/ui";
import { AnalysisOverlay } from "@/components/analysis";
import { useApiRequest } from "@/hooks/useApiRequest";
import { cloneRepository } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { RepositoryUrlForm } from "./RepositoryUrlForm";
import { HeroVisual } from "./HeroVisual";

import { ToastContainer, type ToastMessage } from "@/components/ui/Toast";

const trustBadges = [
  { icon: Zap, label: "Fast analysis", color: "amber" as const, floatDelay: 0 },
  { icon: Lock, label: "Privacy-first", color: "mint" as const, floatDelay: 0.3 },
  { icon: Sparkles, label: "Smart AI", color: "violet" as const, floatDelay: 0.6 },
  { icon: Globe2, label: "Open source", color: "cyan" as const, floatDelay: 0.9 },
];

interface HeroProps {
  onAnalysisComplete?: (repositoryId: string, metadata?: { name: string; owner?: string }) => void;
  onLoginRedirect?: () => void;
}

export function Hero({ onAnalysisComplete, onLoginRedirect }: HeroProps) {
  const { user } = useAuth();
  const [pendingClone, setPendingClone] = useState<{ url: string; token: number } | null>(null);
  const [repositoryId, setRepositoryId] = useState<string | null>(null);
  const [repositoryMeta, setRepositoryMeta] = useState<{ name: string; owner?: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const submitTokenRef = useRef(0);

  const cloneRequest = useApiRequest(
    async (signal) => {
      if (!pendingClone) return null;
      return cloneRepository(pendingClone.url, signal);
    },
    [pendingClone],
    { enabled: pendingClone !== null }
  );

  useEffect(() => {
    if (cloneRequest.data?.success && cloneRequest.data.repository_id) {
      setRepositoryId(cloneRequest.data.repository_id);
      const meta = cloneRequest.data.repository;
      setRepositoryMeta(meta ? { name: meta.name, owner: meta.owner } : null);
      setIsAnalyzing(true);
      setPendingClone(null);
    }
  }, [cloneRequest.data]);

  useEffect(() => {
    if (cloneRequest.error && pendingClone !== null) {
      const id = Date.now().toString();
      setToasts((prev) => [
        ...prev,
        {
          id,
          type: "error",
          title: "Repository Analysis Error",
          message: cloneRequest.error || "Could not reach repository analysis backend.",
        },
      ]);
      setPendingClone(null);
    }
  }, [cloneRequest.error, pendingClone]);

  function handleAnalyzeRequest(url: string) {
    if (!user) {
      onLoginRedirect?.();
      return;
    }
    submitTokenRef.current += 1;
    setPendingClone({ url, token: submitTokenRef.current });
  }

  function handleAnalysisOverlayComplete(meta?: { name: string; owner?: string }) {
    if (repositoryId) {
      setIsAnalyzing(false);
      onAnalysisComplete?.(repositoryId, meta || repositoryMeta || undefined);
    }
  }

  return (
    <>
      <Section container={false} spacing="none" className="relative z-10 flex min-h-[calc(100vh-5rem)] items-center px-6 sm:px-12 lg:px-16 xl:px-20 2xl:px-24 py-4 lg:py-6 w-full">
        <div className="grid w-full items-center gap-12 lg:gap-16 xl:gap-24 grid-cols-1 lg:grid-cols-2">
          <div className="flex flex-col items-center gap-8 text-center lg:items-start lg:text-left w-full">
            <FloatingBadge icon={Sparkles} color="coral" size="large">
              AI-Powered Code Intelligence
            </FloatingBadge>

            <SectionHeading
              titleAs="h1"
              align="center"
              className="lg:items-start lg:text-left [&>p]:max-w-3xl"
              title={
                <>
                  Understand Any <span className="text-gradient-warm">Codebase</span>
                </>
              }
              subtitle="Paste a GitHub repository and watch CommitIt build a living map of every file, function, and connection inside it — then ask it anything."
            />

            <div className="w-full max-w-2xl lg:max-w-3xl">
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

          <div className="hidden justify-center lg:flex lg:justify-end w-full pr-4 sm:pr-8 xl:pr-12">
            <HeroVisual />
          </div>
        </div>
      </Section>

      <AnalysisOverlay
        open={isAnalyzing}
        repositoryId={repositoryId}
        onComplete={handleAnalysisOverlayComplete}
        onClose={() => setIsAnalyzing(false)}
      />

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
}