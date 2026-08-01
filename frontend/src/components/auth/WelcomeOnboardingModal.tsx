import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, GitBranch, Cpu, MessageSquare, ArrowRight, Check, X } from "lucide-react";

interface WelcomeOnboardingModalProps {
  onClose: () => void;
  onImportRepo: () => void;
}

export const WelcomeOnboardingModal: React.FC<WelcomeOnboardingModalProps> = ({ onClose, onImportRepo }) => {
  const [step, setStep] = useState<number>(1);

  const handleFinish = () => {
    localStorage.setItem("hasCompletedOnboarding", "true");
    onClose();
  };

  const handleStartImport = () => {
    localStorage.setItem("hasCompletedOnboarding", "true");
    onClose();
    onImportRepo();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void-950/85 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg rounded-2xl bg-void-900 border border-white/[0.08] p-7 shadow-2xl overflow-hidden"
        >
          <button
            onClick={handleFinish}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  s <= step ? "bg-gradient-to-r from-coral to-magenta" : "bg-white/[0.06]"
                }`}
              />
            ))}
          </div>

          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 bg-coral/10 border border-coral/20 rounded-full py-1 px-3 w-fit text-coral text-xs font-semibold font-mono">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Step 1 of 3</span>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-100 font-display">
                Welcome to CommitIt 👋
              </h3>
              <p className="text-xs text-slate-400 font-body leading-relaxed">
                CommitIt turns your codebase into an interactive universe. Start by importing any public or private Git repository.
              </p>

              <div className="p-4 rounded-xl bg-void-950/50 border border-white/[0.05] flex items-center gap-3.5">
                <div className="p-2.5 rounded-lg bg-coral/10 text-coral">
                  <GitBranch className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200 font-display">Git Repository Import</h4>
                  <p className="text-[11px] text-slate-400 font-body">Supports GitHub, GitLab, and local repository cloning</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleFinish}
                  className="text-xs text-slate-500 hover:text-slate-300 font-body cursor-pointer"
                >
                  Skip Onboarding
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="rounded-xl bg-coral py-2.5 px-4 text-xs font-semibold text-white hover:bg-coral-light transition flex items-center gap-2 cursor-pointer font-body shadow-md"
                >
                  <span>Next Step</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 bg-magenta/10 border border-magenta/20 rounded-full py-1 px-3 w-fit text-magenta text-xs font-semibold font-mono">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Step 2 of 3</span>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-100 font-display">
                Knowledge Model Analysis
              </h3>
              <p className="text-xs text-slate-400 font-body leading-relaxed">
                CommitIt automatically parses file dependencies, AST syntax trees, database schemas, and architectural boundaries.
              </p>

              <div className="p-4 rounded-xl bg-void-950/50 border border-white/[0.05] flex items-center gap-3.5">
                <div className="p-2.5 rounded-lg bg-magenta/10 text-magenta">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200 font-display">Deterministic Code Graph</h4>
                  <p className="text-[11px] text-slate-400 font-body">Grounds responses in verified repository evidence</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-500 hover:text-slate-300 font-body cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="rounded-xl bg-magenta py-2.5 px-4 text-xs font-semibold text-white hover:bg-magenta/90 transition flex items-center gap-2 cursor-pointer font-body shadow-md"
                >
                  <span>Next Step</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 bg-violet/10 border border-violet/20 rounded-full py-1 px-3 w-fit text-violet text-xs font-semibold font-mono">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Step 3 of 3</span>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-100 font-display">
                Ask AI Senior Engineer
              </h3>
              <p className="text-xs text-slate-400 font-body leading-relaxed">
                Converse naturally with an AI assistant that understands architecture, traces request lifecycles, and predicts change impact.
              </p>

              <div className="p-4 rounded-xl bg-void-950/50 border border-white/[0.05] flex items-center gap-3.5">
                <div className="p-2.5 rounded-lg bg-violet/10 text-violet">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200 font-display">Repository-Agnostic Assistant</h4>
                  <p className="text-[11px] text-slate-400 font-body">Zero hallucinations with full citation tracking</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="text-xs text-slate-500 hover:text-slate-300 font-body cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleStartImport}
                  className="rounded-xl bg-gradient-to-r from-coral via-magenta to-violet py-2.5 px-5 text-xs font-bold text-white shadow-lg hover:shadow-xl transition flex items-center gap-2 cursor-pointer font-body border border-white/10"
                >
                  <span>Import First Repository</span>
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
