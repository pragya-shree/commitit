import { GlassCard } from "@/components/ui";
import { HEALTH_STATUS_COLOR } from "./mockDashboardData";
import type { HealthIndicator } from "./types";

/**
 * RepositoryHealthCard — a set of scored indicators (architecture
 * complexity, organization, documentation, dependency freshness), each
 * with a thin `scaleX`-filled bar — the same GPU-friendly technique
 * AnalysisProgress uses, rather than animating `width`. Bars are static
 * once rendered (no count-up) — GlassCard's own entrance animation
 * already gives the whole card motion; animating every individual bar
 * too would be motion for its own sake rather than adding clarity.
 */

interface RepositoryHealthCardProps {
  indicators: HealthIndicator[];
}

export function RepositoryHealthCard({ indicators }: RepositoryHealthCardProps) {
  return (
    <GlassCard title="Repository health" variant="elevated" padding="lg">
      <div className="flex flex-col gap-5">
        {indicators.map((indicator) => (
          <div key={indicator.id} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-ink">{indicator.label}</span>
              <span className="font-mono text-xs text-ink-faint">{indicator.score}/100</span>
            </div>

            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-valuenow={indicator.score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={indicator.label}
            >
              <div
                className="h-full origin-left rounded-full"
                style={{ backgroundColor: HEALTH_STATUS_COLOR[indicator.status], transform: `scaleX(${indicator.score / 100})` }}
              />
            </div>

            <span className="text-xs leading-relaxed text-ink-dim">{indicator.description}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
