import { useState, useEffect } from "react";
import {
  RepositoryDashboard,
  EmptyRepositoryState,
  DashboardSkeleton,
  mockDashboardData,
} from "@/components/dashboard";
import { mapKnowledgeToDashboardData } from "@/components/dashboard/mapKnowledgeToDashboardData";
import { getKnowledge } from "@/services/api";

interface DashboardPageProps {
  repositoryId?: string;
  onViewUniverse?: () => void;
  onSelectRepository?: (id: string, name: string) => void;
  onOpenAssistant?: (sessionId?: string) => void;
  onOpenUniverse?: (repoId: string) => void;
  onImportRepoClick?: () => void;
}

export function DashboardPage({
  repositoryId,
  onViewUniverse,
  onOpenUniverse,
  onImportRepoClick = () => {},
}: DashboardPageProps) {
  const [knowledgeData, setKnowledgeData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repositoryId) {
      setKnowledgeData(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    getKnowledge(repositoryId)
      .then((res) => {
        if (res?.knowledge) {
          setKnowledgeData(res.knowledge);
        }
      })
      .catch((err: any) => {
        setError(err?.message || "Failed to load repository details.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [repositoryId]);

  if (!repositoryId) {
    return (
      <EmptyRepositoryState
        onImportClick={onImportRepoClick}
        onBrowseUniverseClick={() => onViewUniverse?.()}
      />
    );
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const mappedRepoMetrics = knowledgeData
    ? mapKnowledgeToDashboardData(knowledgeData, {
        keyInsights: mockDashboardData.keyInsights,
      })
    : mockDashboardData;

  return (
    <div className="min-h-[calc(100vh-5rem)] pb-12 pt-2">
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-4 p-4 rounded-xl border border-coral/30 bg-coral/10 text-xs font-mono text-coral">
          {error}
        </div>
      )}
      <RepositoryDashboard
        data={mappedRepoMetrics}
        onViewUniverse={onViewUniverse || (() => repositoryId && onOpenUniverse?.(repositoryId))}
      />
    </div>
  );
}