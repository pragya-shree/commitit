import { RepositoryDashboard, mockDashboardData } from "@/components/dashboard";
import { mapKnowledgeToDashboardData } from "@/components/dashboard/mapKnowledgeToDashboardData";
import { LoadingState, ErrorState } from "@/components/ui";
import { useApiRequest } from "@/hooks/useApiRequest";
import { getKnowledge } from "@/services/api";

/**
 * DashboardPage — wraps RepositoryDashboard with real backend metrics
 * (file/folder/symbol/relationship counts and language breakdown, from
 * the same GET /repository/{id}/knowledge call UniversePage already
 * uses) merged with the sections that stay mock (technologies, key
 * insights, recent discoveries, health indicators — see
 * mapKnowledgeToDashboardData for why those specifically can't be real
 * yet). `mockDashboardData` supplies only those still-mock sections;
 * its own repository/metrics/languageBreakdown fields are discarded in
 * favor of the real response.
 */

interface DashboardPageProps {
  repositoryId: string;
  onViewUniverse?: () => void;
}

export function DashboardPage({ repositoryId, onViewUniverse }: DashboardPageProps) {
  const knowledgeRequest = useApiRequest((signal) => getKnowledge(repositoryId, signal), [repositoryId]);

  const dashboardData = knowledgeRequest.data
    ? mapKnowledgeToDashboardData(knowledgeRequest.data.knowledge, {
        keyInsights: mockDashboardData.keyInsights,
      })
    : null;

  return (
    <div className="min-h-[calc(100vh-5rem)] pb-12 pt-4">

      {knowledgeRequest.loading && <LoadingState message="Loading repository metrics…" />}

      {knowledgeRequest.error && !knowledgeRequest.loading && (
        <ErrorState message={knowledgeRequest.error} onRetry={knowledgeRequest.retry} />
      )}

      {dashboardData && <RepositoryDashboard data={dashboardData} onViewUniverse={onViewUniverse} />}
    </div>
  );
}