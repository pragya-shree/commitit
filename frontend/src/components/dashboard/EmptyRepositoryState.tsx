import React from "react";
import { motion } from "framer-motion";
import { GitBranch, Globe, Sparkles, FolderPlus } from "lucide-react";

interface EmptyRepositoryStateProps {
  onImportClick: () => void;
  onBrowseUniverseClick: () => void;
}

export const EmptyRepositoryState: React.FC<EmptyRepositoryStateProps> = ({
  onImportClick,
  onBrowseUniverseClick,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] px-4 text-center select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 rounded-3xl bg-void-900/80 border border-white/[0.08] backdrop-blur-xl shadow-2xl relative overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-coral/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-violet/10 blur-3xl pointer-events-none" />

        <div className="flex justify-center mb-6">
          <div className="relative p-4 rounded-2xl bg-gradient-to-tr from-coral/20 to-violet/20 border border-white/10 text-coral shadow-lg">
            <GitBranch className="h-10 w-10 animate-pulse" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full py-1 px-3 w-fit mx-auto mb-3">
          <Sparkles className="h-3 w-3 text-coral" />
          <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">
            No Repository Loaded
          </span>
        </div>

        <h3 className="text-2xl font-extrabold text-slate-100 font-display mb-2">
          Start Exploring Your Codebase
        </h3>
        <p className="text-xs text-slate-400 font-body leading-relaxed mb-8">
          Import a GitHub repository to build its Knowledge Graph, visualize dependencies, and converse with the CommitIt AI Assistant.
        </p>

        <div className="space-y-3">
          <button
            onClick={onImportClick}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-coral via-magenta to-violet text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer font-body flex items-center justify-center gap-2 border border-white/10"
          >
            <FolderPlus className="h-4 w-4" />
            <span>Import Repository</span>
          </button>

          <button
            onClick={onBrowseUniverseClick}
            className="w-full py-3 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer font-body flex items-center justify-center gap-2 border border-white/[0.08]"
          >
            <Globe className="h-4 w-4 text-cyan-400" />
            <span>Explore Public Code Universe</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
