import { CheckCircle2 } from "lucide-react";
import { GlassCard, FloatingBadge } from "@/components/ui";
import type { LanguageBreakdownEntry, RepositoryDashboardData } from "./types";

/**
 * RepositorySummary — repository identity (name, owner, branch,
 * description) plus a language breakdown bar. The bar is a plain flex
 * row of proportionally-sized divs, not a chart library — a simple CSS
 * technique is all a single stacked-percentage bar needs.
 */

interface RepositorySummaryProps {
  repository: RepositoryDashboardData["repository"];
  languageBreakdown: LanguageBreakdownEntry[];
}

export function RepositorySummary({ repository, languageBreakdown }: RepositorySummaryProps) {
  return (
    <GlassCard variant="elevated" padding="lg">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs text-ink-faint">
              {repository.owner} · {repository.branch}
            </span>
            <h2 className="font-display text-2xl font-bold text-ink">{repository.name}</h2>
            <p className="max-w-xl text-sm leading-relaxed text-ink-dim">{repository.description}</p>
          </div>

          <FloatingBadge icon={CheckCircle2} color="mint" size="compact" float={false}>
            Analyzed {repository.analyzedAt}
          </FloatingBadge>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">Language breakdown</span>

          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/5" role="img" aria-label="Language breakdown">
            {languageBreakdown.map((language) => (
              <div key={language.name} style={{ width: `${language.percentage}%`, backgroundColor: language.color }} />
            ))}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {languageBreakdown.map((language) => (
              <div key={language.name} className="flex items-center gap-2 text-xs text-ink-dim">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: language.color }} aria-hidden="true" />
                {language.name}
                <span className="text-ink-faint">{language.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
