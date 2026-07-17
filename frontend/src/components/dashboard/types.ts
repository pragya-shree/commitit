import type { LucideIcon } from "lucide-react";

/**
 * Repository Dashboard data model.
 *
 * Self-contained, like the universe and explanation modules — no
 * imports from `@/components/universe` or `@/components/explanation`.
 * The mock repository identity ("acme/aurora") intentionally matches
 * mockUniverseData for narrative consistency, but as a plain string,
 * not an import — each module's mock data can evolve independently
 * until a real backend response replaces all three at once.
 */

export interface MetricData {
  id: string;
  label: string;
  /** Display value (used as a fallback, and for non-numeric metrics). */
  value: string;
  /** If present, MetricCard animates a count-up to this number instead of showing `value` statically. */
  numericValue?: number;
  icon: LucideIcon;
  color: string;
  trend?: {
    direction: "up" | "down" | "flat";
    label: string;
  };
}

export interface LanguageBreakdownEntry {
  name: string;
  percentage: number;
  color: string;
}

export interface TechnologyEntry {
  name: string;
  category: "language" | "framework" | "tooling" | "infrastructure";
}

export interface InsightEntry {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export interface DiscoveryEntry extends InsightEntry {
  timestamp: string;
}

export interface HealthIndicator {
  id: string;
  label: string;
  /** 0–100. */
  score: number;
  status: "excellent" | "good" | "fair" | "needs-attention";
  description: string;
}

export interface RepositoryDashboardData {
  repository: {
    name: string;
    owner: string;
    branch: string;
    description: string;
    analyzedAt: string;
  };
  metrics: MetricData[];
  languageBreakdown: LanguageBreakdownEntry[];
  technologies: TechnologyEntry[];
  keyInsights: InsightEntry[];
  recentDiscoveries: DiscoveryEntry[];
  healthIndicators: HealthIndicator[];
}
