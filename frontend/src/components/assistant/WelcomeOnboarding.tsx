import React from "react";
import {
  Search,
  Compass,
  Flame,
  Code2,
  GitBranch,
  Layers,
  ArrowRight,
  Bot,
} from "lucide-react";

interface WelcomeOnboardingProps {
  onSelectPrompt: (prompt: string) => void;
  repositoryName?: string;
}

const EXAMPLE_PROMPTS = [
  {
    icon: Compass,
    title: "Explain this repository",
    prompt: "Explain this repository and provide an architectural overview.",
    color: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400",
  },
  {
    icon: Search,
    title: "Where is authentication?",
    prompt: "Where is authentication implemented in this codebase?",
    color: "from-violet-500/20 to-purple-500/10 border-violet-500/30 text-violet-400",
  },
  {
    icon: GitBranch,
    title: "Trace the login flow",
    prompt: "How does login work? Trace the request lifecycle step by step.",
    color: "from-magenta/20 to-pink-500/10 border-magenta/30 text-magenta",
  },
  {
    icon: Flame,
    title: "Show risky modules",
    prompt: "Which modules are risky or high-complexity hotspots?",
    color: "from-coral/20 to-orange-500/10 border-coral/30 text-coral",
  },
  {
    icon: Layers,
    title: "Compare frontend & backend",
    prompt: "Compare authentication and middleware architecture.",
    color: "from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400",
  },
  {
    icon: Code2,
    title: "Feature placement",
    prompt: "Where should caching or rate limiting live in this repository?",
    color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400",
  },
];

export const WelcomeOnboarding: React.FC<WelcomeOnboardingProps> = ({
  onSelectPrompt,
  repositoryName = "this repository",
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-8 max-w-4xl mx-auto text-center">
      {/* Hero Badge */}
      <div className="relative mb-6">
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-coral via-magenta to-violet opacity-50 blur-lg animate-pulse" />
        <div className="relative flex items-center gap-2.5 px-4 py-2 rounded-full bg-void-900/90 border border-white/10 backdrop-blur-xl shadow-2xl">
          <Bot className="w-5 h-5 text-coral" />
          <span className="text-xs font-bold bg-gradient-to-r from-coral via-magenta to-cyan bg-clip-text text-transparent uppercase tracking-wider font-mono">
            AI Assistant Workspace
          </span>
        </div>
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display mb-3">
        Explore <span className="bg-gradient-to-r from-coral to-magenta bg-clip-text text-transparent">{repositoryName}</span> with Natural Language
      </h1>

      <p className="text-sm sm:text-base text-slate-300 max-w-2xl mb-8 leading-relaxed">
        Ask technical questions, trace execution flows, evaluate change impact, discover design patterns, or explore architectural trade-offs.
      </p>

      {/* Grid of Starter Prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 w-full">
        {EXAMPLE_PROMPTS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.prompt)}
              className={`flex flex-col justify-between text-left p-4 rounded-2xl bg-gradient-to-br ${item.color} border backdrop-blur-xl hover:scale-[1.02] hover:border-white/30 transition-all duration-200 cursor-pointer group shadow-lg`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-void-950/60 border border-white/10">
                    <Icon className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-150" />
                </div>
                <h3 className="text-xs font-bold text-slate-100 font-display mb-1">
                  {item.title}
                </h3>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  "{item.prompt}"
                </p>
              </div>
              <span className="mt-3 text-[10px] font-semibold text-slate-400 group-hover:text-white transition-colors duration-150 flex items-center gap-1 font-mono">
                Ask Assistant <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
