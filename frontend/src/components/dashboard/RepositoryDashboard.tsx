import { Section } from "@/layouts";
import { RepositorySummary } from "./RepositorySummary";
import { MetricsGrid } from "./MetricsGrid";
import { InsightsPanel } from "./InsightsPanel";
import { RepositoryHealthCard } from "./RepositoryHealthCard";
import { TechnologyStack } from "./TechnologyStack";
import { RecentInsights } from "./RecentInsights";
import type { RepositoryDashboardData } from "./types";

/**
 * RepositoryDashboard — the top-level summary view: repository identity
 * and language mix, headline metrics, then two rows of paired detail
 * cards (insights/health, technologies/discoveries).
 *
 * Each row is its own `Section` rather than one Section wrapping
 * everything — a long, stacked dashboard reads better when each group
 * reveals as the user scrolls to it, rather than requiring the entire
 * page to be in view before anything animates. `Section`'s own `fadeUp`
 * wraps each row; MetricsGrid nests its own `staggerContainer` inside
 * that (the same layered-reveal pattern Hero already uses for
 * SectionHeading), and every GlassCard-based section picks up the same
 * propagated "hidden"/"visible" state automatically via the
 * `staggerItem` variant it already carries internally — no extra motion
 * wiring needed per section here.
 *
 * Future backend integration point: everything renders from one
 * `data: RepositoryDashboardData` prop (see types.ts). A real
 * integration replaces `mockDashboardData` with values computed from
 * the backend's Knowledge Model (file/folder counts), Query Engine
 * (language breakdown, technologies), and Explanation Engine (key
 * insights, recent discoveries) — no component here needs to change for
 * that swap.
 */

interface RepositoryDashboardProps {
  data: RepositoryDashboardData;
}

export function RepositoryDashboard({ data }: RepositoryDashboardProps) {
  return (
    <div className="flex flex-col">
      <Section spacing="sm" containerSize="wide">
        <RepositorySummary repository={data.repository} languageBreakdown={data.languageBreakdown} />
      </Section>

      <Section spacing="sm" containerSize="wide">
        <MetricsGrid metrics={data.metrics} />
      </Section>

      <Section spacing="sm" containerSize="wide">
        <div className="grid gap-6 lg:grid-cols-2">
          <InsightsPanel insights={data.keyInsights} />
          <RepositoryHealthCard indicators={data.healthIndicators} />
        </div>
      </Section>

      <Section spacing="sm" containerSize="wide">
        <div className="grid gap-6 lg:grid-cols-2">
          <TechnologyStack technologies={data.technologies} />
          <RecentInsights discoveries={data.recentDiscoveries} />
        </div>
      </Section>
    </div>
  );
}
