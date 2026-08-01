import React, { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { User, Lock, Mail, UserCheck, Sparkles, ArrowRight, Eye, EyeOff, Check, X } from "lucide-react";

interface RegisterPageProps {
  onToggleLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onToggleLogin }) => {
  const { register, loginWithGoogle } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live password strength calculator
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "bg-slate-700" };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: "Weak", color: "bg-coral" };
      case 2:
        return { score: 50, label: "Fair", color: "bg-amber-400" };
      case 3:
        return { score: 75, label: "Good", color: "bg-sky-400" };
      case 4:
        return { score: 100, label: "Strong", color: "bg-emerald-400" };
      default:
        return { score: 15, label: "Very Weak", color: "bg-coral" };
    }
  }, [password]);

  const isValidEmail = useMemo(() => {
    if (!email) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const isValidUsername = useMemo(() => {
    if (!username) return null;
    return username.trim().length >= 3 && /^[a-zA-Z0-9_]+$/.test(username.trim());
  }, [username]);

  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return null;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await register(email.trim(), username.trim(), password, displayName.trim());
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please check your information.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle("google_oauth_id_token_credential");
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] w-full items-center justify-center px-4 py-4 sm:py-6 relative overflow-hidden select-none">
      <AuthBackground />

      <div className="absolute top-1/4 right-1/3 h-[320px] w-[320px] rounded-full bg-magenta/5 blur-[130px] pointer-events-none animate-pulse duration-[8000ms]"></div>
      <div className="absolute bottom-1/4 left-1/3 h-[320px] w-[320px] rounded-full bg-coral/5 blur-[130px] pointer-events-none animate-pulse duration-[10000ms]"></div>

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 bg-void-900/60 border border-white/[0.04] rounded-full py-1 px-3.5 backdrop-blur-md shadow-[0_0_20px_rgba(255,107,82,0.05)]">
            <Sparkles className="h-3 w-3 text-coral animate-pulse" />
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono">
              Join Codebase Universe
            </span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tighter font-display">
            <span className="bg-gradient-to-r from-coral via-magenta to-violet bg-clip-text text-transparent">
              Create Account
            </span>
          </h1>
        </div>

        <div className="relative group rounded-2xl p-[1px] bg-gradient-to-r from-white/[0.08] via-white/[0.03] to-white/[0.08] hover:from-coral/25 hover:via-magenta/25 hover:to-violet/25 transition-all duration-500 shadow-[0_0_40px_-15px_rgba(236,72,153,0.2)]">
          <div className="relative rounded-2xl bg-void-900/70 p-7 backdrop-blur-2xl border border-white/[0.02]">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-lg border border-coral/20 bg-coral/5 p-3 text-xs text-coral-light flex items-start gap-2.5 font-body leading-relaxed"
              >
                <svg className="h-4.5 w-4.5 shrink-0 text-coral" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 font-body">
                  Display Name
                </label>
                <div className="relative group/input">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 group-focus-within/input:text-coral transition-colors duration-200">
                    <UserCheck className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full rounded-xl border border-white/[0.05] bg-void-950/45 py-2.5 pl-11 pr-4 text-slate-200 placeholder-slate-600 outline-none focus:border-coral/40 focus:ring-2 focus:ring-coral/5 hover:border-white/[0.12] transition duration-200 text-sm font-body shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-body">
                    Username <span className="text-coral">*</span>
                  </label>
                  {isValidUsername !== null && (
                    <span className={`text-[10px] flex items-center gap-1 font-mono ${isValidUsername ? "text-emerald-400" : "text-coral"}`}>
                      {isValidUsername ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {isValidUsername ? "Valid handle" : "Min 3 alphanumeric chars"}
                    </span>
                  )}
                </div>
                <div className="relative group/input">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 group-focus-within/input:text-magenta transition-colors duration-200">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="janedoe"
                    className="w-full rounded-xl border border-white/[0.05] bg-void-950/45 py-2.5 pl-11 pr-4 text-slate-200 placeholder-slate-600 outline-none focus:border-magenta/40 focus:ring-2 focus:ring-magenta/5 hover:border-white/[0.12] transition duration-200 text-sm font-body shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-body">
                    Email Address <span className="text-coral">*</span>
                  </label>
                  {isValidEmail !== null && (
                    <span className={`text-[10px] flex items-center gap-1 font-mono ${isValidEmail ? "text-emerald-400" : "text-coral"}`}>
                      {isValidEmail ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {isValidEmail ? "Valid email" : "Invalid format"}
                    </span>
                  )}
                </div>
                <div className="relative group/input">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 group-focus-within/input:text-coral transition-colors duration-200">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@domain.com"
                    className="w-full rounded-xl border border-white/[0.05] bg-void-950/45 py-2.5 pl-11 pr-4 text-slate-200 placeholder-slate-600 outline-none focus:border-coral/40 focus:ring-2 focus:ring-coral/5 hover:border-white/[0.12] transition duration-200 text-sm font-body shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 font-body">
                  Password <span className="text-coral">*</span>
                </label>
                <div className="relative group/input">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 group-focus-within/input:text-violet transition-colors duration-200">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full rounded-xl border border-white/[0.05] bg-void-950/45 py-2.5 pl-11 pr-11 text-slate-200 placeholder-slate-600 outline-none focus:border-violet/40 focus:ring-2 focus:ring-violet/5 hover:border-white/[0.12] transition duration-200 text-sm font-body shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Password strength:</span>
                      <span className="font-bold">{passwordStrength.label}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-void-950 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.score}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-body">
                    Confirm Password <span className="text-coral">*</span>
                  </label>
                  {passwordsMatch !== null && (
                    <span className={`text-[10px] flex items-center gap-1 font-mono ${passwordsMatch ? "text-emerald-400" : "text-coral"}`}>
                      {passwordsMatch ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {passwordsMatch ? "Match" : "Mismatch"}
                    </span>
                  )}
                </div>
                <div className="relative group/input">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 group-focus-within/input:text-violet transition-colors duration-200">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-white/[0.05] bg-void-950/45 py-2.5 pl-11 pr-4 text-slate-200 placeholder-slate-600 outline-none focus:border-violet/40 focus:ring-2 focus:ring-violet/5 hover:border-white/[0.12] transition duration-200 text-sm font-body shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="relative overflow-hidden w-full rounded-xl bg-gradient-to-r from-coral via-magenta to-violet py-3 text-sm font-semibold text-white shadow-[0_4px_15px_rgba(255,107,82,0.15)] hover:shadow-[0_4px_20px_rgba(255,107,82,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:pointer-events-none transition duration-200 mt-3 flex items-center justify-center gap-2 cursor-pointer font-body border border-white/10"
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Sign Up</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <div className="relative my-4 flex items-center justify-center">
              <div className="w-full border-t border-white/[0.06]"></div>
              <span className="absolute bg-void-900 px-3 text-[10px] uppercase tracking-widest text-slate-500 font-mono">
                OR
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-white/[0.08] bg-void-950/40 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.04] hover:border-white/[0.15] transition duration-200 flex items-center justify-center gap-2.5 cursor-pointer font-body shadow-sm"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="mt-4 text-center text-xs text-slate-500 font-body">
              Already have an account?{" "}
              <button
                onClick={onToggleLogin}
                className="font-semibold text-coral hover:text-coral-light hover:underline transition duration-150 outline-none cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
export default RegisterPage;
