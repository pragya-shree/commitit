import React, { useMemo } from "react";
import type { KnowledgeModel, TreeNode } from "@/services/api";
import { brand } from "@/theme";
import { Compass, BookOpen, Terminal, Code2, Server, Database, Layers } from "lucide-react";

interface StartHereProps {
  knowledge: KnowledgeModel | null;
  onSelectNode: (nodeId: string, label: string) => void;
}

interface DiscoveredEntryPoint {
  key: string;
  title: string;
  description: string;
  path: string;
  targetNodeId: string;
  targetNodeLabel: string;
  icon: any;
  color: string;
}

interface CategoryGroup {
  name: string;
  items: DiscoveredEntryPoint[];
}

function findFilePathInTree(node: TreeNode, fileName: string, currentPath = ""): string | null {
  const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
  if (node.type === "file" && node.name.toLowerCase() === fileName.toLowerCase()) {
    return fullPath;
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findFilePathInTree(child, fileName, fullPath);
      if (found) return found;
    }
  }
  return null;
}

function findDirectoryInTree(node: TreeNode, dirName: string, currentPath = ""): string | null {
  const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
  if (node.type === "directory" && node.name.toLowerCase() === dirName.toLowerCase()) {
    return fullPath;
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findDirectoryInTree(child, dirName, fullPath);
      if (found) return found;
    }
  }
  return null;
}

export const StartHere = React.memo(function StartHere({
  knowledge,
  onSelectNode,
}: StartHereProps) {
  const categories = useMemo(() => {
    if (!knowledge) return [];

    const docItems: DiscoveredEntryPoint[] = [];
    const appEntryItems: DiscoveredEntryPoint[] = [];
    const frontendItems: DiscoveredEntryPoint[] = [];
    const backendItems: DiscoveredEntryPoint[] = [];
    const configItems: DiscoveredEntryPoint[] = [];
    const apiItems: DiscoveredEntryPoint[] = [];
    const dbItems: DiscoveredEntryPoint[] = [];

    // README
    const readmePath = findFilePathInTree(knowledge.tree, "README.md");
    if (readmePath) {
      docItems.push({
        key: "readme",
        title: "Project Documentation",
        description: "Explore the master repository README containing setup guides, workspace definitions, and module mappings.",
        path: readmePath,
        targetNodeId: "root",
        targetNodeLabel: "Workspace Root",
        icon: BookOpen,
        color: brand.coral,
      });
    }

    // Backend entry point
    const backendEntry = findFilePathInTree(knowledge.tree, "run.py") || findFilePathInTree(knowledge.tree, "main.py") || findFilePathInTree(knowledge.tree, "app.py");
    if (backendEntry) {
      appEntryItems.push({
        key: "backend-entry",
        title: "Backend Entry Point",
        description: "Discovered Python main/run execution endpoint initializing the FastAPI server and loading routers.",
        path: backendEntry,
        targetNodeId: "backend",
        targetNodeLabel: "backend",
        icon: Server,
        color: brand.violet,
      });
    }

    // Frontend entry point
    const frontendEntry = findFilePathInTree(knowledge.tree, "App.tsx") || findFilePathInTree(knowledge.tree, "main.tsx") || findFilePathInTree(knowledge.tree, "index.html");
    if (frontendEntry) {
      appEntryItems.push({
        key: "frontend-entry",
        title: "Frontend Application Client",
        description: "Vite React entry point loading core application pages, theme providers, and the live workspace graph.",
        path: frontendEntry,
        targetNodeId: "frontend",
        targetNodeLabel: "frontend",
        icon: Layers,
        color: brand.cyan,
      });
    }

    // Frontend source codes
    const universePage = findFilePathInTree(knowledge.tree, "UniversePage.tsx");
    if (universePage) {
      frontendItems.push({
        key: "universe-page",
        title: "Universe Visualization View",
        description: "The primary page orchestrating the codebase solar rendering and tools menu drawer.",
        path: universePage,
        targetNodeId: "frontend",
        targetNodeLabel: "frontend",
        icon: Layers,
        color: brand.cyan,
      });
    }

    // Backend api layer
    const apiDir = findDirectoryInTree(knowledge.tree, "api") || findDirectoryInTree(knowledge.tree, "routes");
    if (apiDir) {
      apiItems.push({
        key: "api-layer",
        title: "REST API Route Definitions",
        description: "API router directory exposing client endpoints, request handling functions, and token response adapters.",
        path: apiDir,
        targetNodeId: "backend",
        targetNodeLabel: "backend",
        icon: Code2,
        color: brand.mint,
      });
    }

    // DB session & init
    const dbDir = findDirectoryInTree(knowledge.tree, "db") || findDirectoryInTree(knowledge.tree, "models");
    if (dbDir) {
      dbItems.push({
        key: "db-layer",
        title: "Database Session & ORM Models",
        description: "Storage layout managing session context builders, SQLite DB connections, and SQLAlchemy schema models.",
        path: dbDir,
        targetNodeId: "backend",
        targetNodeLabel: "backend",
        icon: Database,
        color: brand.magenta,
      });
    }

    // Config files
    const configPaths = [
      { name: "vite.config.ts", desc: "Vite build pipeline config." },
      { name: "pyproject.toml", desc: "Python dependency build config." },
      { name: "alembic.ini", desc: "Alembic DB migration configs." },
      { name: "package.json", desc: "NPM client dependency configuration." },
    ];

    configPaths.forEach((cfg) => {
      const foundPath = findFilePathInTree(knowledge.tree, cfg.name);
      if (foundPath) {
        configItems.push({
          key: `config-${cfg.name}`,
          title: `Config: ${cfg.name}`,
          description: cfg.desc,
          path: foundPath,
          targetNodeId: "root",
          targetNodeLabel: "Workspace Root",
          icon: Terminal,
          color: brand.amber,
        });
      }
    });

    const groups: CategoryGroup[] = [];
    if (docItems.length > 0) groups.push({ name: "Documentation", items: docItems });
    if (appEntryItems.length > 0) groups.push({ name: "Application Entry", items: appEntryItems });
    if (frontendItems.length > 0) groups.push({ name: "Frontend", items: frontendItems });
    if (backendItems.length > 0 || apiItems.length > 0) {
      groups.push({ name: "Backend & API Layer", items: [...backendItems, ...apiItems] });
    }
    if (dbItems.length > 0) groups.push({ name: "Database & Storage", items: dbItems });
    if (configItems.length > 0) groups.push({ name: "Configuration", items: configItems });

    return groups;
  }, [knowledge]);

  if (categories.length === 0) {
    return (
      <div className="text-center py-12 px-4 flex flex-col items-center gap-2">
        <p className="text-sm font-bold text-ink-dim font-display">No codebase entry points detected</p>
        <p className="text-xs text-slate-500 font-mono">
          Could not confidently parse repository starting locations from the active file tree.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="px-1 flex flex-col">
        <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider flex items-center gap-1.5">
          <Compass className="h-3.5 w-3.5 text-cyan" />
          Codebase Onboarding Checklist
        </span>
        <p className="text-xs text-slate-400 font-body leading-relaxed mt-1">
          These verified entry paths were automatically discovered using real repository workspace metrics. Click any card to navigate.
        </p>
      </div>

      <div className="flex flex-col gap-6 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
        {categories.map((category) => (
          <div key={category.name} className="flex flex-col gap-2.5">
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold border-b border-white/[0.03] pb-1 px-1 flex justify-between items-center">
              <span>{category.name}</span>
              <span className="text-[9px] text-slate-600">({category.items.length} matched)</span>
            </div>

            <div className="flex flex-col gap-2">
              {category.items.map((entry) => {
                const Icon = entry.icon;
                return (
                  <button
                    key={entry.key}
                    onClick={() => onSelectNode(entry.targetNodeId, entry.targetNodeLabel)}
                    className="group flex items-start gap-4 p-4 rounded-2xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-200 text-left outline-none cursor-pointer relative overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]"
                  >
                    {/* Background color subtle glow on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 pointer-events-none"
                      style={{ backgroundColor: entry.color }}
                    />

                    <div
                      className="p-3 rounded-xl border shrink-0 transition-transform duration-300 group-hover:scale-105"
                      style={{
                        borderColor: `${entry.color}25`,
                        backgroundColor: `${entry.color}0d`,
                        color: entry.color,
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-ink font-display group-hover:text-coral transition-colors duration-200">
                        {entry.title}
                      </h4>
                      <p className="text-xs text-slate-300 font-body leading-relaxed mt-1 mb-2">
                        {entry.description}
                      </p>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-white/[0.03] pt-2 mt-1">
                        <span className="truncate">Path: {entry.path}</span>
                        <span className="text-coral font-bold group-hover:underline shrink-0 ml-2">Inspect Folder</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
