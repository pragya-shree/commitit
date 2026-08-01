import React from "react";
import {
  FileText,
  Code2,
  ShieldAlert,
  Activity,
  Flame,
  Search,
  ExternalLink,
} from "lucide-react";

interface EvidenceCardProps {
  type: "file" | "symbol" | "impact" | "health" | "heatmap" | "search";
  title: string;
  subtitle?: string;
  metrics?: Record<string, string | number>;
  onClick?: () => void;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  type,
  title,
  subtitle,
  metrics,
  onClick,
}) => {
  const getIcon = () => {
    switch (type) {
      case "file":
        return <FileText className="w-3.5 h-3.5 text-cyan" />;
      case "symbol":
        return <Code2 className="w-3.5 h-3.5 text-violet-400" />;
      case "impact":
        return <ShieldAlert className="w-3.5 h-3.5 text-coral" />;
      case "health":
        return <Activity className="w-3.5 h-3.5 text-mint" />;
      case "heatmap":
        return <Flame className="w-3.5 h-3.5 text-amber-400" />;
      case "search":
        return <Search className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case "file":
        return "border-cyan/30 hover:border-cyan/60 bg-cyan/5";
      case "symbol":
        return "border-violet-500/30 hover:border-violet-500/60 bg-violet-500/5";
      case "impact":
        return "border-coral/30 hover:border-coral/60 bg-coral/5";
      case "health":
        return "border-mint/30 hover:border-mint/60 bg-mint/5";
      case "heatmap":
        return "border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5";
      case "search":
        return "border-blue-500/30 hover:border-blue-500/60 bg-blue-500/5";
    }
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${getBorderColor()} backdrop-blur-md transition-all duration-200 cursor-pointer group shadow-sm text-xs font-mono`}
    >
      <div className="p-1 rounded-md bg-void-950/60 border border-white/10">
        {getIcon()}
      </div>

      <div className="flex flex-col text-left overflow-hidden">
        <span className="font-semibold text-slate-200 group-hover:text-white truncate max-w-[200px]">
          {title}
        </span>
        {subtitle && (
          <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
            {subtitle}
          </span>
        )}
      </div>

      {metrics && (
        <div className="flex items-center gap-1.5 ml-1.5 pl-2 border-l border-white/10 text-[10px] text-slate-400 font-mono">
          {Object.entries(metrics).map(([k, v]) => (
            <span key={k} className="px-1.5 py-0.5 rounded bg-white/[0.05]">
              {k}: <strong className="text-slate-200">{v}</strong>
            </span>
          ))}
        </div>
      )}

      {onClick && (
        <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
      )}
    </div>
  );
};
