import { ArrowLeft } from "lucide-react";
import { RepositoryDashboard, mockDashboardData } from "@/components/dashboard";
import { GradientButton } from "@/components/ui";
import { PageContainer } from "@/layouts";

/**
 * DashboardPage — wraps RepositoryDashboard with its mock data and a
 * small "back to universe" affordance, mirroring UniversePage's role for
 * the universe module.
 */

interface DashboardPageProps {
  onBack?: () => void;
}

export function DashboardPage({ onBack }: DashboardPageProps) {
  return (
    <div className="min-h-screen pb-16">
      {onBack && (
        <PageContainer size="wide" className="pt-8">
          <GradientButton variant="ghost" size="sm" leftIcon={ArrowLeft} onClick={onBack}>
            Back to Universe
          </GradientButton>
        </PageContainer>
      )}

      <RepositoryDashboard data={mockDashboardData} />
    </div>
  );
}
