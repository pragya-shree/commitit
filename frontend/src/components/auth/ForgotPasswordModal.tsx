import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, X, CheckCircle, ArrowRight } from "lucide-react";
import { forgotPassword } from "@/services/api";

interface ForgotPasswordModalProps {
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onClose }) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setSubmitted(true);
    } catch {
      setSubmitted(true);
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
                Reset your password
              </h3>
              <p className="text-xs text-slate-400 font-body mb-6">
                Enter your account email address and we'll send you a password reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 font-body">
                    Email Address
                  </label>
                  <div className="relative group/input">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="w-full rounded-xl border border-white/[0.05] bg-void-950/45 py-3 pl-11 pr-4 text-slate-200 placeholder-slate-600 outline-none focus:border-coral/40 focus:ring-2 focus:ring-coral/5 transition text-sm font-body"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-gradient-to-r from-coral to-magenta py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer font-body border border-white/10"
                >
                  {isSubmitting ? (
                    <span>Sending instructions...</span>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-emerald-400 animate-bounce" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 font-display">Check your inbox</h3>
              <p className="text-xs text-slate-400 font-body leading-relaxed max-w-xs mx-auto">
                If an account exists for <span className="text-coral font-semibold">{email}</span>, we have sent instructions to reset your password.
              </p>
              <button
                onClick={onClose}
                className="w-full mt-4 rounded-xl border border-white/[0.08] bg-void-950/50 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.05] transition cursor-pointer font-body"
              >
                Close
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
