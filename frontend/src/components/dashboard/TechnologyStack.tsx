import { GlassCard, FloatingBadge } from "@/components/ui";
import type { TechnologyEntry } from "./types";

/**
 * TechnologyStack — every detected technology as a color-coded chip
 * (color follows category: language/framework/tooling/infrastructure).
 * Badges don't float here (`float={false}`) — a dense grid of
 * continuously bobbing chips would be busy rather than lively in a
 * data-dense dashboard context.
 */

interface TechnologyStackProps {
  technologies: TechnologyEntry[];
}

export function TechnologyStack({ technologies }: TechnologyStackProps) {
  return (
    <GlassCard title="Technology stack" variant="elevated" padding="lg">
      <div className="flex flex-wrap gap-2">
        {technologies.map((technology) => (
          <FloatingBadge
            key={technology.name}
            color={colorNameFor(technology.category)}
            size="compact"
            float={false}
          >
            {technology.name}
          </FloatingBadge>
        ))}
      </div>
    </GlassCard>
  );
}

/**
 * FloatingBadge's `color` prop takes a palette *name*, not a hex value —
 * this maps each technology category to the matching named color rather
 * than the hex values in mockDashboardData's TECHNOLOGY_CATEGORY_COLOR
 * (which exists for any future non-badge usage that needs the raw hex).
 */
function colorNameFor(category: TechnologyEntry["category"]): "coral" | "violet" | "amber" | "cyan" {
  switch (category) {
    case "language":
      return "coral";
    case "framework":
      return "violet";
    case "tooling":
      return "amber";
    case "infrastructure":
      return "cyan";
  }
}
