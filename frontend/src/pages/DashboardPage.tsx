import { ArrowLeft } from "lucide-react";
import { RepositoryDashboard, mockDashboardData } from "@/components/dashboard";
import { mapKnowledgeToDashboardData } from "@/components/dashboard/mapKnowledgeToDashboardData";
import { GradientButton, LoadingState, ErrorState } from "@/components/ui";
import { PageContainer } from "@/layouts";
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
  onBack?: () => void;
}

export function DashboardPage({ repositoryId, onBack }: DashboardPageProps) {
  const knowledgeRequest = useApiRequest((signal) => getKnowledge(repositoryId, signal), [repositoryId]);

  const dashboardData = knowledgeRequest.data
    ? mapKnowledgeToDashboardData(knowledgeRequest.data.knowledge, {
        technologies: mockDashboardData.technologies,
        keyInsights: mockDashboardData.keyInsights,
        recentDiscoveries: mockDashboardData.recentDiscoveries,
        healthIndicators: mockDashboardData.healthIndicators,
      })
    : null;

  return (
    <div className="min-h-screen pb-16">
      {onBack && (
        <PageContainer size="wide" className="pt-8">
          <GradientButton variant="ghost" size="sm" leftIcon={ArrowLeft} onClick={onBack}>
            Back to Universe
          </GradientButton>
        </PageContainer>
      )}

      {knowledgeRequest.loading && <LoadingState message="Loading repository metrics…" />}

      {knowledgeRequest.error && !knowledgeRequest.loading && (
        <ErrorState message={knowledgeRequest.error} onRetry={knowledgeRequest.retry} />
      )}

      {dashboardData && <RepositoryDashboard data={dashboardData} />}
    </div>
  );
}