import { useEffect, useState } from "react";
import { animate } from "framer-motion";
import { cn } from "@/utils/cn";
import { GlassCard } from "@/components/ui";
import { easing } from "@/theme";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { MetricData } from "./types";

/**
 * MetricCard — a single stat. When `metric.numericValue` is set, the
 * displayed number counts up from 0 on mount (the same imperative
 * `animate()` technique already used by useAnalysisSequence) rather than
 * appearing instantly — the signature "animated metric" moment for the
 * dashboard. Metrics without a `numericValue` (non-numeric values like
 * scores or labels) just show `value` as static text; not every number
 * on the page counts up, only the most prominent ones, to avoid the
 * whole dashboard feeling like it's constantly animating.
 */

interface MetricCardProps {
  metric: MetricData;
  /** Position in the grid — staggers the count-up start slightly per card. */
  index?: number;
}

const trendColorClasses: Record<NonNullable<MetricData["trend"]>["direction"], string> = {
  up: "text-mint",
  down: "text-coral",
  flat: "text-ink-faint",
};

export function MetricCard({ metric, index = 0 }: MetricCardProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [displayValue, setDisplayValue] = useState<number | null>(metric.numericValue !== undefined ? 0 : null);
  const Icon = metric.icon;

  useEffect(() => {
    if (metric.numericValue === undefined) return;

    if (reduceMotion) {
      setDisplayValue(metric.numericValue);
      return;
    }

    const controls = animate(0, metric.numericValue, {
      duration: 1.4,
      delay: 0.2 + index * 0.08,
      ease: easing.standard,
      onUpdate: (value) => setDisplayValue(Math.round(value)),
    });

    return () => controls.stop();
  }, [metric.numericValue, reduceMotion, index]);

  return (
    <GlassCard variant="elevated" padding="md" interaction="hover">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">{metric.label}</span>
          <span className="font-display text-3xl font-bold text-ink">
            {displayValue !== null ? displayValue.toLocaleString() : metric.value}
          </span>
          {metric.trend && (
            <span className={cn("text-xs", trendColorClasses[metric.trend.direction])}>{metric.trend.label}</span>
          )}
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${metric.color}1f`, color: metric.color }}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </GlassCard>
  );
}
