import { GlassCard } from "@/components/ui";
import type { DiscoveryEntry } from "./types";

/**
 * RecentInsights — a timestamped discovery feed (distinct from
 * InsightsPanel's thesis-level observations), styled as a vertical
 * timeline: a thin connecting line between each icon, feed-like rather
 * than a flat list, reinforcing that these are things found over time
 * as analysis progressed.
 */

interface RecentInsightsProps {
  discoveries: DiscoveryEntry[];
}

export function RecentInsights({ discoveries }: RecentInsightsProps) {
  return (
    <GlassCard title="Recent discoveries" variant="elevated" padding="lg">
      <div className="flex flex-col gap-5">
        {discoveries.map((discovery, index) => {
          const Icon = discovery.icon;
          const isLast = index === discoveries.length - 1;

          return (
            <div key={discovery.id} className="relative flex gap-3">
              {!isLast && <span className="absolute left-[15px] top-8 h-[calc(100%-4px)] w-px bg-white/10" aria-hidden="true" />}

              <div
                className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-void-900"
                style={{ color: discovery.color }}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>

              <div className="flex flex-col gap-0.5 pb-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-medium text-ink">{discovery.title}</span>
                  <span className="text-[11px] text-ink-faint">{discovery.timestamp}</span>
                </div>
                <span className="text-xs leading-relaxed text-ink-dim">{discovery.description}</span>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
