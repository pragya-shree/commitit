import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { User, Lock, Sparkles, ArrowRight } from "lucide-react";

interface LoginPageProps {
  onToggleRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onToggleRegister }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login(username, password);
    } catch (err: any) {
      setError(err?.message || "Invalid username or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] w-full items-center justify-center px-4 py-4 sm:py-6 relative overflow-hidden select-none">
      {/* Code Universe Canvas Background */}
      <AuthBackground />

      {/* Decorative ambient glowing backdrops */}
      <div className="absolute top-1/4 left-1/3 h-[320px] w-[320px] rounded-full bg-coral/5 blur-[130px] pointer-events-none animate-pulse duration-[8000ms]"></div>
      <div className="absolute bottom-1/4 right-1/3 h-[320px] w-[320px] rounded-full bg-violet/5 blur-[130px] pointer-events-none animate-pulse duration-[10000ms]"></div>

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 bg-void-900/60 border border-white/[0.04] rounded-full py-1 px-3.5 backdrop-blur-md shadow-[0_0_20px_rgba(255,107,82,0.05)]">
            <Sparkles className="h-3 w-3 text-coral animate-pulse" />
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono">Entering Codebase Universe</span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tighter font-display">
            <span className="bg-gradient-to-r from-coral via-magenta to-violet bg-clip-text text-transparent">
              CommitIt
            </span>
          </h1>
          <p className="text-sm text-slate-400 max-w-xs leading-relaxed font-body">
            Where your code universe comes alive.
          </p>
        </div>

        {/* Card Frame */}
        <div className="relative group rounded-2xl p-[1px] bg-gradient-to-r from-white/[0.08] via-white/[0.03] to-white/[0.08] hover:from-coral/25 hover:via-magenta/25 hover:to-violet/25 transition-all duration-500 shadow-[0_0_40px_-15px_rgba(139,92,246,0.2)]">
          {/* Glass Card */}
          <div className="relative rounded-2xl bg-void-900/70 p-8 backdrop-blur-2xl border border-white/[0.02]">
            <h2 className="text-2xl font-bold text-slate-100 mb-6 text-center font-display tracking-tight">
              Welcome Back
            </h2>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 rounded-lg border border-coral/20 bg-coral/5 p-3 text-xs text-coral-light flex items-start gap-2.5 font-body leading-relaxed"
              >
                <svg className="h-4.5 w-4.5 shrink-0 text-coral" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-body">
                  Username
                </label>
                <div className="relative group/input">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 group-focus-within/input:text-coral transition-colors duration-200">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full rounded-xl border border-white/[0.05] bg-void-950/45 py-3 pl-11 pr-4 text-slate-200 placeholder-slate-600 outline-none focus:border-coral/40 focus:ring-2 focus:ring-coral/5 hover:border-white/[0.12] transition duration-200 text-sm font-body shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-body">
                  Password
                </label>
                <div className="relative group/input">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 group-focus-within/input:text-violet transition-colors duration-200">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-white/[0.05] bg-void-950/45 py-3 pl-11 pr-4 text-slate-200 placeholder-slate-600 outline-none focus:border-violet/40 focus:ring-2 focus:ring-violet/5 hover:border-white/[0.12] transition duration-200 text-sm font-body shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="relative overflow-hidden w-full rounded-xl bg-gradient-to-r from-coral via-magenta to-violet py-3 text-sm font-semibold text-white shadow-[0_4px_15px_rgba(255,107,82,0.15)] hover:shadow-[0_4px_20px_rgba(255,107,82,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:pointer-events-none transition duration-200 mt-2 flex items-center justify-center gap-2 cursor-pointer font-body border border-white/10"
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-500 font-body">
              Don't have an account?{" "}
              <button
                onClick={onToggleRegister}
                className="font-semibold text-coral hover:text-coral-light hover:underline transition duration-150 outline-none cursor-pointer"
              >
                Create one now
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
export default LoginPage;
