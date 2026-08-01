import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Zap,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Layers,
  FileCode,
  Folder,
  ArrowRight,
  Search,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Info,
  GitBranch,
} from "lucide-react";
import type { KnowledgeModel, ImpactAnalysisResult } from "@/services/api";
import { getImpactAnalysis } from "@/services/api";
import { brand } from "@/theme";

interface ImpactRadarProps {
  knowledge: KnowledgeModel | null;
  selectedNodeId?: string | null;
  onSelectNode?: (targetId: string) => void;
  onImpactAnalysisChange?: (result: ImpactAnalysisResult | null) => void;
}

export const ImpactRadar = React.memo(function ImpactRadar({
  knowledge,
  selectedNodeId,
  onSelectNode,
  onImpactAnalysisChange,
}: ImpactRadarProps) {
  // Candidate options for targets from knowledge.tree top directories & modules
  const targetOptions = useMemo(() => {
    if (!knowledge) return [];
    const options: { id: string; name: string; type: "folder" | "file" }[] = [];

    // Top directories
    if (knowledge.tree.children) {
      knowledge.tree.children
        .filter((c) => c.type === "directory")
        .forEach((dir) => {
          options.push({ id: dir.name, name: `${dir.name}/`, type: "folder" });
        });
    }

    // Top files
    if (knowledge.modules) {
      knowledge.modules.slice(0, 15).forEach((mod) => {
        if (mod.path) {
          options.push({ id: mod.path, name: mod.path, type: "file" });
        }
      });
    }

    return options;
  }, [knowledge]);

  // Selected target state (defaulting to selectedNodeId or first folder)
  const [currentTarget, setCurrentTarget] = useState<string>(() => {
    if (selectedNodeId && selectedNodeId !== "root") return selectedNodeId;
    return targetOptions.length > 0 ? targetOptions[0].id : "app";
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ImpactAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<"direct" | "indirect" | "chains">("direct");

  // Fetch impact analysis when currentTarget or repository_id changes
  useEffect(() => {
    if (!knowledge?.repository_id || !currentTarget) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getImpactAnalysis(knowledge.repository_id, currentTarget, controller.signal)
      .then((res) => {
        if (res.success && res.impact) {
          setAnalysisResult(res.impact);
          onImpactAnalysisChange?.(res.impact);
        } else {
          setError("Failed to process impact telemetry.");
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message || "Error analyzing repository impact.");
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [knowledge?.repository_id, currentTarget, onImpactAnalysisChange]);

  const handleSelectTarget = useCallback(
    (targetId: string) => {
      setCurrentTarget(targetId);
      onSelectNode?.(targetId);
    },
    [onSelectNode]
  );

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return targetOptions;
    const q = searchQuery.toLowerCase();
    return targetOptions.filter(
      (opt) => opt.name.toLowerCase().includes(q) || opt.id.toLowerCase().includes(q)
    );
  }, [targetOptions, searchQuery]);

  // Criticality Styling Helpers
  const criticalityBadge = useMemo(() => {
    if (!analysisResult) return { color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/30", label: "LOW" };
    switch (analysisResult.criticality) {
      case "CRITICAL":
        return { color: "text-coral", bg: "bg-coral/10", border: "border-coral/40", label: "CRITICAL IMPACT" };
      case "HIGH":
        return { color: "text-amber", bg: "bg-amber/10", border: "border-amber/40", label: "HIGH IMPACT" };
      case "MEDIUM":
        return { color: "text-cyan", bg: "bg-cyan/10", border: "border-cyan/40", label: "MEDIUM IMPACT" };
      default:
        return { color: "text-mint", bg: "bg-mint/10", border: "border-mint/40", label: "LOW IMPACT" };
    }
  }, [analysisResult]);

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Scope Selector Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl border border-white/[0.08] bg-void-950/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-coral/10 border border-coral/30 text-coral shadow-[0_0_15px_rgba(255,107,82,0.15)]">
            <Zap className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold font-display text-ink flex items-center gap-2">
              <span>Target Node:</span>
              <span className="font-mono text-cyan bg-cyan/10 px-2 py-0.5 rounded-md border border-cyan/20">
                {currentTarget}
              </span>
            </h4>
            <p className="text-xs text-slate-400 font-body">
              Predictive downstream dependency blast-radius telemetry
            </p>
          </div>
        </div>

        {/* Target Picker */}
        <div className="relative min-w-[200px]">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search file or folder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-void-900 border border-white/10 text-ink placeholder-slate-500 focus:outline-none focus:border-cyan/50 transition"
            />
          </div>
          {searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-void-900 border border-white/10 rounded-xl shadow-2xl z-30 p-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      handleSelectTarget(opt.id);
                      setSearchQuery("");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-white/5 rounded-lg text-slate-300 hover:text-ink transition cursor-pointer"
                  >
                    {opt.type === "folder" ? (
                      <Folder className="h-3.5 w-3.5 text-violet shrink-0" />
                    ) : (
                      <FileCode className="h-3.5 w-3.5 text-cyan shrink-0" />
                    )}
                    <span className="font-mono truncate">{opt.name}</span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-slate-500 font-mono">No matching nodes</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Target Quick Selection Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider shrink-0">
          Quick Targets:
        </span>
        {targetOptions.slice(0, 6).map((opt) => (
          <button
            key={opt.id}
            onClick={() => handleSelectTarget(opt.id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer shrink-0 border ${
              currentTarget === opt.id
                ? "bg-coral/15 border-coral/40 text-coral font-bold shadow-[0_0_10px_rgba(255,107,82,0.15)]"
                : "bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
            }`}
          >
            {opt.name}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-12 rounded-2xl border border-white/[0.05] bg-white/[0.01] flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-6 w-6 text-coral animate-spin" />
          <p className="text-xs text-slate-400 font-mono animate-pulse">
            Computing AST dependency propagation matrix for "{currentTarget}"...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-5 rounded-2xl border border-coral/30 bg-coral/5 flex items-center gap-3 text-coral text-xs font-mono">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Analysis Results Display */}
      {analysisResult && !loading && (
        <div className="flex flex-col gap-5">
          {/* Main Telemetry Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Impact Score Meter */}
            <div className="p-5 rounded-2xl border border-white/[0.08] bg-void-950/40 flex flex-col justify-between gap-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-slate-400 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-coral" />
                  Impact Score
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${criticalityBadge.bg} ${criticalityBadge.color} ${criticalityBadge.border}`}
                >
                  {criticalityBadge.label}
                </span>
              </div>

              <div className="flex items-baseline gap-2 my-1">
                <span className="text-4xl font-black font-display text-ink">
                  {analysisResult.impact_score}
                </span>
                <span className="text-xs text-slate-500 font-mono font-semibold">/ 100</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.min(100, analysisResult.impact_score)}%`,
                    backgroundColor:
                      analysisResult.impact_score > 75
                        ? brand.coral
                        : analysisResult.impact_score > 50
                        ? brand.amber
                        : analysisResult.impact_score > 25
                        ? brand.cyan
                        : brand.mint,
                  }}
                />
              </div>
            </div>

            {/* Direct Dependents Card */}
            <div className="p-5 rounded-2xl border border-white/[0.08] bg-void-950/40 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-slate-400 flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber" />
                  Direct Dependents
                </span>
                <span className="text-xs font-mono text-amber font-bold">
                  {analysisResult.metrics.direct_dependents_count} files
                </span>
              </div>
              <div className="text-2xl font-black font-display text-ink my-0.5">
                {analysisResult.metrics.direct_dependents_count}
              </div>
              <p className="text-[11px] text-slate-400 font-body">
                Immediate import/call dependents requiring update checks.
              </p>
            </div>

            {/* Transitive Blast Radius Card */}
            <div className="p-5 rounded-2xl border border-white/[0.08] bg-void-950/40 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-slate-400 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-violet" />
                  Max Depth & Centrality
                </span>
                <span className="text-xs font-mono text-violet font-bold">
                  Depth: {analysisResult.metrics.dependency_depth}
                </span>
              </div>
              <div className="text-2xl font-black font-display text-ink my-0.5">
                {analysisResult.metrics.total_dependents} total files
              </div>
              <p className="text-[11px] text-slate-400 font-body">
                Centrality score: {(analysisResult.metrics.centrality_score * 100).toFixed(0)}% · Fan-in: {analysisResult.metrics.fan_in}
              </p>
            </div>
          </div>

          {/* Explainability Engine Section (Surfacing reasons for AI & Human) */}
          <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.01] flex flex-col gap-3">
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-slate-400 flex items-center gap-1.5 border-b border-white/[0.04] pb-2">
              <Sparkles className="h-3.5 w-3.5 text-amber" />
              Explainability Telemetry & Scoring Rationale
            </span>

            <div className="space-y-2 pt-1">
              {analysisResult.reasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs font-body text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-mint shrink-0 mt-0.5" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>

            {/* Explainability factors breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/[0.03]">
              {analysisResult.explainability.map((factor, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-white/[0.03] bg-void-950/30 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold font-display text-ink">
                    <span>{factor.title}</span>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                      {factor.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal font-body">
                    {factor.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Tab Navigation for Detailed Breakdown */}
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
            <button
              onClick={() => setActiveTab("direct")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "direct"
                  ? "bg-coral/15 text-coral border border-coral/30"
                  : "text-slate-400 hover:text-ink hover:bg-white/5"
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Direct Dependents ({analysisResult.metrics.direct_dependents_count})</span>
            </button>
            <button
              onClick={() => setActiveTab("indirect")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "indirect"
                  ? "bg-amber/15 text-amber border border-amber/30"
                  : "text-slate-400 hover:text-ink hover:bg-white/5"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Indirect Dependents ({analysisResult.metrics.indirect_dependents_count})</span>
            </button>
            <button
              onClick={() => setActiveTab("chains")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "chains"
                  ? "bg-cyan/15 text-cyan border border-cyan/30"
                  : "text-slate-400 hover:text-ink hover:bg-white/5"
              }`}
            >
              <GitBranch className="h-3.5 w-3.5" />
              <span>Dependency Chains ({analysisResult.dependency_chains.length})</span>
            </button>
          </div>

          {/* Tab Content Display */}
          <div className="min-h-[160px] max-h-64 overflow-y-auto pr-1 scrollbar-thin">
            {activeTab === "direct" && (
              <div className="space-y-2">
                {analysisResult.affected_files.filter((f) => f.impact_type === "direct").length > 0 ? (
                  analysisResult.affected_files
                    .filter((f) => f.impact_type === "direct")
                    .map((file) => (
                      <div
                        key={file.path}
                        onClick={() => handleSelectTarget(file.path)}
                        className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] flex items-center justify-between text-xs transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileCode className="h-4 w-4 text-coral shrink-0" />
                          <span className="font-mono text-slate-200 truncate">{file.path}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                          {file.symbol_count} symbol(s)
                        </span>
                      </div>
                    ))
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500 font-mono bg-void-950/20 rounded-xl border border-white/[0.03]">
                    No direct downstream dependents found for this node.
                  </div>
                )}
              </div>
            )}

            {activeTab === "indirect" && (
              <div className="space-y-2">
                {analysisResult.affected_files.filter((f) => f.impact_type === "indirect").length > 0 ? (
                  analysisResult.affected_files
                    .filter((f) => f.impact_type === "indirect")
                    .map((file) => (
                      <div
                        key={file.path}
                        onClick={() => handleSelectTarget(file.path)}
                        className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] flex items-center justify-between text-xs transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileCode className="h-4 w-4 text-amber shrink-0" />
                          <span className="font-mono text-slate-200 truncate">{file.path}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                          Transitive
                        </span>
                      </div>
                    ))
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500 font-mono bg-void-950/20 rounded-xl border border-white/[0.03]">
                    No indirect downstream dependents found for this node.
                  </div>
                )}
              </div>
            )}

            {activeTab === "chains" && (
              <div className="space-y-2.5">
                {analysisResult.dependency_chains.length > 0 ? (
                  analysisResult.dependency_chains.map((chain, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-white/[0.04] bg-void-950/30 flex flex-col gap-2 text-xs"
                    >
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                        <Info className="h-3 w-3 text-cyan shrink-0" />
                        <span>Propagation path #{idx + 1}:</span>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono text-slate-300 scrollbar-none">
                        {chain.steps.map((step, stepIdx) => (
                          <React.Fragment key={stepIdx}>
                            <span
                              onClick={() => handleSelectTarget(step)}
                              className={`px-2 py-0.5 rounded hover:underline cursor-pointer ${
                                stepIdx === 0
                                  ? "text-coral font-bold bg-coral/10"
                                  : stepIdx === chain.steps.length - 1
                                  ? "text-cyan font-bold bg-cyan/10"
                                  : "text-slate-300 bg-white/5"
                              }`}
                            >
                              {step}
                            </span>
                            {stepIdx < chain.steps.length - 1 && (
                              <ArrowRight className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500 font-mono bg-void-950/20 rounded-xl border border-white/[0.03]">
                    No multi-step dependency chains to display.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default ImpactRadar;
