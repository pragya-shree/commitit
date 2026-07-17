import { GlassCard } from "@/components/ui";
import type { InsightEntry } from "./types";

/**
 * InsightsPanel — the AI-generated "key insights": thesis-level
 * observations about the codebase, not a timestamped feed (that's
 * RecentInsights). Each insight is icon + title + description, no
 * per-item card — these read as one connected list of findings, not
 * separate cards competing for attention.
 */

interface InsightsPanelProps {
  insights: InsightEntry[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  return (
    <GlassCard title="Key insights" variant="elevated" padding="lg">
      <div className="flex flex-col gap-4">
        {insights.map((insight) => {
          const Icon = insight.icon;
          return (
            <div key={insight.id} className="flex items-start gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${insight.color}1f`, color: insight.color }}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-ink">{insight.title}</span>
                <span className="text-xs leading-relaxed text-ink-dim">{insight.description}</span>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
