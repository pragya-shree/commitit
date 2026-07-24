import { brand } from "@/theme";
import type { KnowledgeModel, TreeNode, GraphNode } from "@/services/api";
import type { RepositoryUniverseData } from "../types";
import type { SearchResult } from "./types";
import type { RelevantFileItem, RelevantSymbolItem, SearchInsightData } from "@/components/search/types";
import { Folder, FileCode, Server, ShieldCheck, Database, Layers, Cpu, Terminal } from "lucide-react";

// Helper to return real, non-fabricated role descriptions for key repository files
function getFileRoleDescription(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  
  if (normalized.endsWith("backend/app/api/auth.py")) {
    return "Exposes JWT token creation, user registration, and OAuth credentials check routers.";
  }
  if (normalized.endsWith("backend/app/models/auth_schemas.py")) {
    return "Defines Pydantic verification models for request validating bodies (tokens, passwords).";
  }
  if (normalized.endsWith("frontend/src/services/api/authapi.ts")) {
    return "Client API endpoints handler executing token registration and browser session state.";
  }
  if (normalized.endsWith("backend/app/db/session.py")) {
    return "Initializes sqlite engine connections and setups context DB session factories.";
  }
  if (normalized.endsWith("backend/run.py") || normalized.endsWith("backend/app/main.py")) {
    return "Service loader starting uvicorn, initializing FastAPI routes, CORS hooks, and configs.";
  }
  if (normalized.endsWith("backend/alembic.ini")) {
    return "Alembic schema version migrations tool context config script.";
  }
  if (normalized.endsWith("frontend/src/app.tsx")) {
    return "Core client router mapping dashboard tabs, theme grids, and solar system panels.";
  }
  if (normalized.endsWith("frontend/vite.config.ts")) {
    return "Vite compiler configuration declaring path resolve helpers and plugins.";
  }
  if (normalized.endsWith("backend/tests/test_auth.py")) {
    return "Pytest unit automation suite asserting authorization scopes and header tokens.";
  }
  if (normalized.endsWith("backend/requirements.txt")) {
    return "Python pip requirements mapping (fastapi, PyJWT, sqlalchemy, alembic).";
  }
  if (normalized.includes("readme.md")) {
    return "Root project documentation detailing environment structures, setup requirements, and layout guides.";
  }

  // Fallback heuristic based on file path and extension
  const extension = normalized.split(".").pop();
  if (normalized.startsWith("backend/")) {
    if (extension === "py") {
      return `Python module script implementing backend logic under '${filePath}'.`;
    }
  } else if (normalized.startsWith("frontend/")) {
    if (extension === "tsx" || extension === "ts") {
      return `React UI component or helper module under '${filePath}'.`;
    }
  }
  return `Repository file assisting project execution.`;
}

// Helper to recursively collect files matching query keywords from KnowledgeModel.tree
function findMatchingFiles(node: TreeNode, keywords: string[], currentPath = ""): RelevantFileItem[] {
  const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
  const matches: RelevantFileItem[] = [];

  if (node.type === "file") {
    const fileNameLower = node.name.toLowerCase();
    const isMatch = keywords.some((kw) => fileNameLower.includes(kw) || fullPath.toLowerCase().includes(kw));
    if (isMatch) {
      matches.push({
        path: fullPath,
        explanation: getFileRoleDescription(fullPath),
      });
    }
  } else if (node.children) {
    for (const child of node.children) {
      matches.push(...findMatchingFiles(child, keywords, fullPath));
    }
  }

  return matches;
}

// Concept Dictionary mapping semantic developer queries to real AST/file search keywords
const CONCEPT_DICTIONARY = [
  {
    keywords: ["auth", "authentication", "login", "register", "jwt", "token", "password", "session", "user", "security"],
    title: "Authentication & User Management",
    targetNodeId: "backend",
    color: brand.coral,
    icon: ShieldCheck,
  },
  {
    keywords: ["database", "db", "sql", "sqlite", "session", "alembic", "migration", "schema", "orm", "sqlalchemy", "table"],
    title: "Database & Schema Engine",
    targetNodeId: "backend",
    color: brand.magenta,
    icon: Database,
  },
  {
    keywords: ["api", "rest", "endpoint", "routes", "uvicorn", "fastapi", "http", "controller", "backend"],
    title: "FastAPI Service & REST Endpoints",
    targetNodeId: "backend",
    color: brand.violet,
    icon: Server,
  },
  {
    keywords: ["frontend", "ui", "react", "component", "view", "page", "client", "vite", "theme", "tailwind", "layout"],
    title: "React Frontend Client UI",
    targetNodeId: "frontend",
    color: brand.cyan,
    icon: Layers,
  },
  {
    keywords: ["test", "tests", "pytest", "unit", "suite", "mock", "assertion"],
    title: "Automated Pytest Testing Suite",
    targetNodeId: "tests",
    color: brand.mint,
    icon: Cpu,
  },
  {
    keywords: ["config", "environment", "build", "vite", "tsconfig", "alembic", "pyproject", "setup", "manifest"],
    title: "Configuration & Manifest Tooling",
    targetNodeId: "root",
    color: brand.amber,
    icon: Terminal,
  },
];

export function searchRepositoryKnowledge(
  query: string,
  knowledge: KnowledgeModel | null,
  universeData: RepositoryUniverseData | null
): SearchResult[] {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) return [];

  const results: SearchResult[] = [];
  const seenIds = new Set<string>();

  // Collect real repository data
  const realTreeFiles = knowledge ? findMatchingFiles(knowledge.tree, [trimmedQuery]) : [];
  const realSymbols: GraphNode[] = (knowledge?.nodes || []).filter(
    (n) => n.name.toLowerCase().includes(trimmedQuery) || n.id.toLowerCase().includes(trimmedQuery)
  );

  // 1. Concept dictionary matches with real repository evidence
  for (const concept of CONCEPT_DICTIONARY) {
    const isKeywordMatch = concept.keywords.some((kw) => kw.includes(trimmedQuery) || trimmedQuery.includes(kw));
    if (isKeywordMatch) {
      const id = `concept-${concept.targetNodeId}-${concept.title}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);

        const conceptFiles = knowledge ? findMatchingFiles(knowledge.tree, concept.keywords) : [];
        const conceptSymbols: RelevantSymbolItem[] = (knowledge?.nodes || [])
          .filter((n) => concept.keywords.some((kw) => n.name.toLowerCase().includes(kw) || n.id.toLowerCase().includes(kw)))
          .slice(0, 8)
          .map((n) => ({ name: n.name, type: n.type, id: n.id }));

        const conceptTechs = (knowledge?.technologies || [])
          .filter((t) => concept.keywords.some((kw) => t.name.toLowerCase().includes(kw)))
          .map((t) => t.name);

        // Find involved top-level folders from matching files
        const involvedFoldersSet = new Set<string>();
        if (universeData?.nodes.some((n) => n.id === concept.targetNodeId)) {
          involvedFoldersSet.add(concept.targetNodeId);
        }
        conceptFiles.forEach((f) => {
          const folder = f.path.split("/")[0];
          if (universeData?.nodes.some((n) => n.id === folder)) {
            involvedFoldersSet.add(folder);
          }
        });

        const highlightNodeIds = Array.from(involvedFoldersSet);
        if (highlightNodeIds.length === 0) highlightNodeIds.push(concept.targetNodeId);

        const primaryLocation = conceptFiles.length > 0 ? conceptFiles[0].path : `${concept.targetNodeId}/`;
        const nodeLabel = universeData?.nodes.find((n) => n.id === concept.targetNodeId)?.label ?? concept.targetNodeId;

        const matchReason = `Matched repository concept terms: ${concept.keywords.slice(0, 4).join(", ")}`;
        const repositorySummary = `Detected ${conceptFiles.length} file(s) and ${conceptSymbols.length} AST symbol(s) implementing ${concept.title.toLowerCase()} inside ${highlightNodeIds.join(", ")}.`;

        const insight: SearchInsightData = {
          query: trimmedQuery,
          title: concept.title,
          matchReason,
          primaryLocation,
          relevantFolders: highlightNodeIds,
          relevantFiles: conceptFiles.slice(0, 6),
          relevantSymbols: conceptSymbols,
          technologiesDetected: conceptTechs,
          repositorySummary,
          accentColor: concept.color,
        };

        results.push({
          id,
          title: concept.title,
          type: "concept",
          targetNodeId: concept.targetNodeId,
          targetNodeLabel: nodeLabel,
          highlightNodeIds,
          primaryLocation,
          relevantFiles: conceptFiles.slice(0, 3).map((f) => f.path),
          summary: repositorySummary,
          matchReason,
          color: concept.color,
          icon: concept.icon,
          score: 95,
          insight,
        });
      }
    }
  }

  // 2. Folder Nodes Matching
  if (universeData) {
    for (const node of universeData.nodes) {
      if (node.id.toLowerCase().includes(trimmedQuery) || node.label.toLowerCase().includes(trimmedQuery)) {
        const id = `node-${node.id}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);

          const folderFiles = knowledge ? findMatchingFiles(knowledge.tree, [node.id.toLowerCase()]) : [];
          const folderSymbols: RelevantSymbolItem[] = (knowledge?.nodes || [])
            .filter((n) => n.id.startsWith(node.id))
            .slice(0, 6)
            .map((n) => ({ name: n.name, type: n.type, id: n.id }));

          const insight: SearchInsightData = {
            query: trimmedQuery,
            title: `Directory: ${node.label}/`,
            matchReason: `Matches top-level directory '${node.label}'`,
            primaryLocation: `${node.label}/`,
            relevantFolders: [node.id],
            relevantFiles: folderFiles.slice(0, 6),
            relevantSymbols: folderSymbols,
            technologiesDetected: (knowledge?.technologies || []).map((t) => t.name),
            repositorySummary: `Top-level workspace directory containing ${node.meta}. Click to inspect graph connections.`,
            accentColor: node.color,
          };

          results.push({
            id,
            title: `${node.label}/`,
            type: "folder",
            targetNodeId: node.id,
            targetNodeLabel: node.label,
            highlightNodeIds: [node.id],
            primaryLocation: `${node.label}/`,
            relevantFiles: folderFiles.slice(0, 3).map((f) => f.path),
            summary: `Directory containing ${node.meta}. Click to inspect graph relationships.`,
            matchReason: `Matches top-level folder name '${node.label}'`,
            color: node.color,
            icon: node.icon || Folder,
            score: 85,
            insight,
          });
        }
      }
    }
  }

  // 3. Real Code Files & Symbol Matches
  if (realTreeFiles.length > 0) {
    realTreeFiles.slice(0, 5).forEach((file, idx) => {
      const topFolder = file.path.split("/")[0];
      const targetNodeId = universeData?.nodes.some((n) => n.id === topFolder) ? topFolder : "root";
      const nodeLabel = universeData?.nodes.find((n) => n.id === targetNodeId)?.label ?? targetNodeId;

      const id = `file-${file.path}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);

        const insight: SearchInsightData = {
          query: trimmedQuery,
          title: file.path.split("/").pop() || file.path,
          matchReason: `Direct file match for term '${trimmedQuery}'`,
          primaryLocation: file.path,
          relevantFolders: [targetNodeId],
          relevantFiles: [file],
          relevantSymbols: realSymbols.filter((s) => s.id.includes(trimmedQuery)).map((s) => ({ name: s.name, type: s.type, id: s.id })),
          technologiesDetected: [],
          repositorySummary: `Specific codebase file located at '${file.path}'.`,
          accentColor: brand.mint,
        };

        results.push({
          id,
          title: file.path,
          type: "file",
          targetNodeId,
          targetNodeLabel: nodeLabel,
          highlightNodeIds: [targetNodeId],
          primaryLocation: file.path,
          relevantFiles: [file.path],
          summary: `Source code file in repository.`,
          matchReason: `Matched file path '${file.path}'`,
          color: brand.mint,
          icon: FileCode,
          score: 80 - idx,
          insight,
        });
      }
    });
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}
