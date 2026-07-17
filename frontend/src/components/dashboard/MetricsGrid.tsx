import { motion } from "framer-motion";
import { staggerContainer } from "@/animations";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { MetricCard } from "./MetricCard";
import type { MetricData } from "./types";

/**
 * MetricsGrid — a responsive grid of MetricCards, staggered in as the
 * grid scrolls into view. Each card's own count-up (see MetricCard)
 * layers on top of this entrance stagger rather than replacing it.
 *
 * MetricCard (via GlassCard → AnimatedCard) already carries its own
 * `staggerItem` variant internally and picks up "hidden"/"visible"
 * propagation directly from this grid's `staggerContainer` — no need to
 * wrap each card in a second motion element with the same variant,
 * which would just double the entrance offset.
 */

interface MetricsGridProps {
  metrics: MetricData[];
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <motion.div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
      variants={staggerContainer({ reduceMotion })}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
    >
      {metrics.map((metric, index) => (
        <MetricCard key={metric.id} metric={metric} index={index} />
      ))}
    </motion.div>
  );
}
