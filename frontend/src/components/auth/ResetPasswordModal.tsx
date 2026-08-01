import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, X, CheckCircle, ArrowRight } from "lucide-react";
import { resetPassword } from "@/services/api";

interface ResetPasswordModalProps {
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ token, onClose, onSuccess }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Failed to reset password. The link may have expired.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md rounded-2xl bg-void-900 border border-white/[0.08] p-6 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {!submitted ? (
            <>
              <h3 className="text-xl font-bold text-slate-100 font-display mb-2">
                Create new password
              </h3>
              <p className="text-xs text-slate-400 font-body mb-6">
                Enter your new password below to regain access to your CommitIt account.
              </p>

              {error && (
                <div className="mb-4 rounded-lg border border-coral/20 bg-coral/5 p-3 text-xs text-coral-light font-body">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 font-body">
                    New Password
                  </label>
                  <div className="relative group/input">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 chars with letters & numbers"
                      className="w-full rounded-xl border border-white/[0.05] bg-void-950/45 py-3 pl-11 pr-4 text-slate-200 placeholder-slate-600 outline-none focus:border-coral/40 focus:ring-2 focus:ring-coral/5 transition text-sm font-body"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 font-body">
                    Confirm New Password
                  </label>
                  <div className="relative group/input">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-white/[0.05] bg-void-950/45 py-3 pl-11 pr-4 text-slate-200 placeholder-slate-600 outline-none focus:border-coral/40 focus:ring-2 focus:ring-coral/5 transition text-sm font-body"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-gradient-to-r from-coral via-magenta to-violet py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer font-body border border-white/10"
                >
                  {isSubmitting ? (
                    <span>Resetting password...</span>
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 font-display">Password Reset Complete</h3>
              <p className="text-xs text-slate-400 font-body max-w-xs mx-auto">
                Your password has been successfully updated. You can now log in with your new credentials.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onSuccess();
                }}
                className="w-full mt-4 rounded-xl bg-coral py-2.5 text-xs font-semibold text-white hover:bg-coral-light transition cursor-pointer font-body"
              >
                Go to Sign In
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
