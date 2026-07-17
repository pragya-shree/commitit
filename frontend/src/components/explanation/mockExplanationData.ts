import type { NodeExplanation } from "./types";

/**
 * Mock explanation data, keyed by node id. Stands in for what a real
 * backend (Context Builder + Explanation Engine / LLM) would eventually
 * return for a given node — see AIExplanationPanel's doc comment for how
 * this shape maps to a future API response.
 */
export const mockExplanationData: Record<string, NodeExplanation> = {
  root: {
    nodeId: "root",
    title: "acme/aurora",
    summary:
      "A TypeScript web application with a component-driven frontend, a thin API layer, and a shared library of utilities used across both.",
    purpose:
      "The repository root ties together the app's five main areas — UI, business logic, API routes, shared utilities, and styling — into a single deployable project.",
    responsibilities: [
      "Defines the project's build and dependency configuration",
      "Hosts top-level routing and app entry points",
      "Coordinates how src, components, lib, api, and styles fit together",
    ],
    relatedFiles: [
      { path: "package.json", description: "Dependencies and scripts" },
      { path: "tsconfig.json", description: "TypeScript configuration" },
    ],
    technologies: ["TypeScript", "Vite", "React"],
    keyRelationships: [
      { targetNodeId: "src", label: "Contains the application's entry points" },
      { targetNodeId: "api", label: "Exposes server-side routes" },
    ],
  },
  src: {
    nodeId: "src",
    title: "src/",
    summary: "The application's entry points and top-level pages — where routing and page-level composition live.",
    purpose: "Wires together components, API calls, and shared utilities into the screens a user actually sees.",
    responsibilities: [
      "Defines page-level layouts and routes",
      "Composes components into complete screens",
      "Initiates data fetching for each page",
    ],
    relatedFiles: [
      { path: "src/App.tsx", description: "Root application component" },
      { path: "src/pages/Dashboard.tsx", description: "Main dashboard page" },
    ],
    technologies: ["React", "React Router"],
    keyRelationships: [
      { targetNodeId: "components", label: "Composes UI from shared components" },
      { targetNodeId: "api", label: "Calls API routes for page data" },
    ],
  },
  components: {
    nodeId: "components",
    title: "components/",
    summary: "Reusable UI building blocks shared across every page — buttons, cards, forms, and layout primitives.",
    purpose: "Keeps the interface visually and behaviorally consistent by centralizing every reusable piece of UI in one place.",
    responsibilities: [
      "Implements presentational, mostly-stateless UI components",
      "Applies the app's design tokens and styling conventions",
      "Exposes a typed prop API for each component",
    ],
    relatedFiles: [
      { path: "components/Button.tsx", description: "Primary button component" },
      { path: "components/Card.tsx", description: "Generic content card" },
    ],
    technologies: ["React", "Tailwind CSS"],
    keyRelationships: [
      { targetNodeId: "lib", label: "Uses shared formatting and validation helpers" },
      { targetNodeId: "styles", label: "Applies shared design tokens" },
    ],
  },
  lib: {
    nodeId: "lib",
    title: "lib/",
    summary: "Framework-agnostic shared logic — formatting, validation, and data helpers used by both the frontend and the API.",
    purpose: "Avoids duplicating logic between the UI layer and the API layer by keeping shared, pure functions in one place.",
    responsibilities: [
      "Implements formatting and validation helpers",
      "Defines shared TypeScript types used across the codebase",
      "Wraps common data-transformation logic",
    ],
    relatedFiles: [
      { path: "lib/format.ts", description: "Date and currency formatting" },
      { path: "lib/validation.ts", description: "Shared input validation" },
    ],
    technologies: ["TypeScript"],
    keyRelationships: [
      { targetNodeId: "components", label: "Used by components for formatting" },
      { targetNodeId: "api", label: "Used by API routes for validation" },
      { targetNodeId: "utils", label: "Builds on lower-level utility functions" },
    ],
  },
  utils: {
    nodeId: "utils",
    title: "utils/",
    summary: "Small, low-level helper functions with no dependencies on the rest of the app.",
    purpose: "Provides generic, single-purpose helpers (string manipulation, array utilities, simple math) that anything can depend on safely.",
    responsibilities: ["Implements small pure utility functions", "Stays free of app-specific business logic"],
    relatedFiles: [{ path: "utils/strings.ts", description: "String manipulation helpers" }],
    technologies: ["TypeScript"],
    keyRelationships: [{ targetNodeId: "lib", label: "Used as a building block by lib" }],
  },
  api: {
    nodeId: "api",
    title: "api/",
    summary: "Server-side route handlers that back the frontend — authentication, data access, and third-party integrations.",
    purpose: "Provides a thin, typed HTTP layer between the frontend and the underlying data sources.",
    responsibilities: [
      "Defines HTTP route handlers",
      "Validates incoming requests",
      "Talks to the database and external services",
    ],
    relatedFiles: [
      { path: "api/routes/users.ts", description: "User account endpoints" },
      { path: "api/routes/repositories.ts", description: "Repository analysis endpoints" },
    ],
    technologies: ["Node.js", "TypeScript"],
    keyRelationships: [
      { targetNodeId: "lib", label: "Uses shared validation helpers" },
      { targetNodeId: "src", label: "Called from page-level data fetching" },
    ],
  },
  styles: {
    nodeId: "styles",
    title: "styles/",
    summary: "Design tokens and global styling — color palette, typography scale, and shared visual primitives.",
    purpose: "Centralizes the app's visual language so every component draws from the same source of truth.",
    responsibilities: ["Defines design tokens (color, type, spacing)", "Configures global/base styles"],
    relatedFiles: [{ path: "styles/tokens.css", description: "Design token definitions" }],
    technologies: ["Tailwind CSS", "CSS"],
    keyRelationships: [{ targetNodeId: "components", label: "Consumed by every component" }],
  },
};
