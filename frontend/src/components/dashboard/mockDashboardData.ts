import {
  Activity,
  Boxes,
  Code2,
  Files,
  FolderTree,
  Lightbulb,
  Puzzle,
  Shapes,
} from "lucide-react";
import { brand } from "@/theme";
import type { RepositoryDashboardData } from "./types";

/**
 * Mock Repository Dashboard data — stands in for what a real backend
 * (Knowledge Model + Query Engine + Explanation Engine) would eventually
 * compute for an analyzed repository. See RepositoryDashboard.tsx for
 * how this shape maps to a future API response.
 */
export const mockDashboardData: RepositoryDashboardData = {
  repository: {
    name: "acme/aurora",
    owner: "acme",
    branch: "main",
    description: "A TypeScript web application with a component-driven frontend, a thin API layer, and shared utilities.",
    analyzedAt: "2 minutes ago",
  },
  metrics: [
    { id: "files", label: "Files analyzed", value: "1,248", numericValue: 1248, icon: Files, color: brand.coral, trend: { direction: "up", label: "+12% this week" } },
    { id: "folders", label: "Folders", value: "86", numericValue: 86, icon: FolderTree, color: brand.violet },
    { id: "components", label: "Components analyzed", value: "312", numericValue: 312, icon: Boxes, color: brand.mint, trend: { direction: "up", label: "+8% this week" } },
    { id: "loc", label: "Lines of code", value: "48,900", numericValue: 48900, icon: Code2, color: brand.amber },
  ],
  languageBreakdown: [
    { name: "TypeScript", percentage: 68, color: brand.coral },
    { name: "CSS", percentage: 18, color: brand.violet },
    { name: "JavaScript", percentage: 10, color: brand.amber },
    { name: "Other", percentage: 4, color: brand.mint },
  ],
  technologies: [
    { name: "TypeScript", category: "language" },
    { name: "React", category: "framework" },
    { name: "Vite", category: "tooling" },
    { name: "Tailwind CSS", category: "framework" },
    { name: "Node.js", category: "infrastructure" },
    { name: "ESLint", category: "tooling" },
  ],
  keyInsights: [
    {
      id: "modular",
      title: "Modular component architecture",
      description: "UI is organized into small, reusable components with clear single responsibilities.",
      icon: Puzzle,
      color: brand.violet,
    },
    {
      id: "shared-lib",
      title: "Centralized shared logic",
      description: "Formatting, validation, and data helpers are consolidated in lib/, avoiding duplication between the UI and API layers.",
      icon: Lightbulb,
      color: brand.amber,
    },
    {
      id: "typed-boundaries",
      title: "Consistently typed API boundaries",
      description: "API route handlers and their frontend callers share types, reducing the chance of request/response mismatches.",
      icon: Shapes,
      color: brand.mint,
    },
  ],
  recentDiscoveries: [
    {
      id: "d1",
      title: "New API route detected",
      description: "api/routes/repositories.ts now exposes a repository analysis endpoint.",
      icon: Activity,
      color: brand.magenta,
      timestamp: "2 minutes ago",
    },
    {
      id: "d2",
      title: "Shared validation helper added",
      description: "lib/validation.ts is now used by both api/ and components/.",
      icon: Lightbulb,
      color: brand.amber,
      timestamp: "6 minutes ago",
    },
    {
      id: "d3",
      title: "Design tokens centralized",
      description: "styles/tokens.css consolidates color and typography values previously scattered across components.",
      icon: Shapes,
      color: brand.cyan,
      timestamp: "14 minutes ago",
    },
  ],
  healthIndicators: [
    { id: "architecture", label: "Architecture complexity", score: 72, status: "good", description: "Moderate — clear module boundaries with some cross-cutting dependencies." },
    { id: "organization", label: "Code organization", score: 88, status: "excellent", description: "Consistent folder structure and naming conventions throughout." },
    { id: "documentation", label: "Documentation coverage", score: 54, status: "fair", description: "Core modules are documented; some utility functions are not." },
    { id: "dependencies", label: "Dependency freshness", score: 91, status: "excellent", description: "Nearly all dependencies are on their latest stable versions." },
  ],
};

export const HEALTH_STATUS_COLOR: Record<RepositoryDashboardData["healthIndicators"][number]["status"], string> = {
  excellent: brand.mint,
  good: brand.cyan,
  fair: brand.amber,
  "needs-attention": brand.coral,
};

export const TECHNOLOGY_CATEGORY_COLOR: Record<RepositoryDashboardData["technologies"][number]["category"], string> = {
  language: brand.coral,
  framework: brand.violet,
  tooling: brand.amber,
  infrastructure: brand.cyan,
};
