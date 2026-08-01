import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Shield,
  Key,
  Trash2,
  X,
  Check,
  Camera,
  Monitor,
  Globe,
  Clock,
  User as UserIcon,
  AlertCircle,
  BarChart3,
  Sliders,
  Bell,
  Download,
  Activity as ActivityIcon,
  RefreshCw,
  Sparkles,
  Lock,
  Smartphone,
  Laptop,
  Layers,
  Database,
  FileCode,
  Code2,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import {
  changePassword,
  checkEmail,
  checkUsername,
  clearUserHistory,
  downloadAccountExport,
  fetchActivity,
  fetchUserSessions,
  linkProvider,
  removeAvatar,
  resendEmailVerification,
  terminateAllOtherSessions,
  terminateSession,
  unlinkProvider,
  uploadAvatar,
  type UserActivity,
  type UserSession,
} from "@/services/api";
import { AvatarCropperModal } from "./AvatarCropperModal";
import { ToastContainer, type ToastMessage } from "@/components/ui/Toast";

interface UserProfileModalProps {
  onClose: () => void;
}

type Tab = "overview font-display" | "profile" | "providers" | "security" | "preferences" | "activity" | "privacy" | "danger";

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose }) => {
  const { user, preferences, stats, updateProfile, updatePreferences, deleteAccount, setUser, refreshStats } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview font-display");

  // Form State
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");

  // Live Validation state
  const [usernameStatus, setUsernameStatus] = useState<{ loading: boolean; available?: boolean; message?: string }>({ loading: false });
  const [emailStatus, setEmailStatus] = useState<{ loading: boolean; available?: boolean; message?: string }>({ loading: false });

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Modals & UI states
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Danger Zone state
  const [deleteConfirmUser, setDeleteConfirmUser] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [showFinalDeleteModal, setShowFinalDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: "success" | "error" | "info" | "warning", title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const hasUnsavedProfileChanges =
    user && (displayName.trim() !== user.display_name || username.trim() !== user.username || email.trim() !== user.email);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name);
      setUsername(user.username);
      setEmail(user.email);
    }
  }, [user]);

  // Load sessions when Security tab opens
  useEffect(() => {
    if (activeTab === "security") {
      loadSessions();
    }
  }, [activeTab]);

  // Load activity timeline when Activity or Overview tab opens
  useEffect(() => {
    if (activeTab === "activity" || activeTab === "overview font-display") {
      loadActivity();
    }
  }, [activeTab]);

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const data = await fetchUserSessions();
      setSessions(data);
    } catch (e) {
      // Ignore
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadActivity = async () => {
    setIsLoadingActivity(true);
    try {
      const data = await fetchActivity(20);
      setActivities(data);
    } catch (e) {
      // Ignore
    } finally {
      setIsLoadingActivity(false);
    }
  };

  // Debounced live username availability check
  useEffect(() => {
    if (!username || !user || username.trim() === user.username) {
      setUsernameStatus({ loading: false });
      return;
    }
    const timer = setTimeout(async () => {
      setUsernameStatus({ loading: true });
      try {
        const res = await checkUsername(username.trim());
        setUsernameStatus({ loading: false, available: res.available, message: res.message });
      } catch {
        setUsernameStatus({ loading: false, available: false, message: "Error checking username" });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [username, user]);

  // Debounced live email availability check
  useEffect(() => {
    if (!email || !user || email.trim().toLowerCase() === user.email.toLowerCase()) {
      setEmailStatus({ loading: false });
      return;
    }
    const timer = setTimeout(async () => {
      setEmailStatus({ loading: true });
      try {
        const res = await checkEmail(email.trim());
        setEmailStatus({ loading: false, available: res.available, message: res.message });
      } catch {
        setEmailStatus({ loading: false, available: false, message: "Error checking email" });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [email, user]);

  if (!user) return null;

  // Handlers
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus.available === false) {
      addToast("error", "Username unavailable", usernameStatus.message);
      return;
    }
    if (emailStatus.available === false) {
      addToast("error", "Email address registered", emailStatus.message);
      return;
    }
    setIsSavingProfile(true);
    try {
      await updateProfile({
        display_name: displayName.trim(),
        username: username.trim(),
        email: email.trim(),
      });
      addToast("success", "Profile Updated", "Your account profile information has been saved.");
    } catch (err: any) {
      addToast("error", "Update Failed", err?.message || "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleResetProfileChanges = () => {
    setDisplayName(user.display_name);
    setUsername(user.username);
    setEmail(user.email);
    setUsernameStatus({ loading: false });
    setEmailStatus({ loading: false });
  };

  const handleAvatarSave = async (dataUrl: string) => {
    try {
      const updatedUser = await uploadAvatar(dataUrl);
      setUser(updatedUser);
      addToast("success", "Avatar Updated", "Your profile avatar has been updated successfully.");
    } catch (err: any) {
      addToast("error", "Avatar Error", err?.message || "Failed to upload avatar.");
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const updatedUser = await removeAvatar();
      setUser(updatedUser);
      addToast("success", "Avatar Removed", "Restored initials avatar fallback.");
    } catch (err: any) {
      addToast("error", "Remove Avatar Failed", err?.message);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      addToast("error", "Weak Password", "New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast("error", "Password Mismatch", "New password and confirmation do not match.");
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      addToast("success", "Password Changed", "Your password has been updated successfully.");
    } catch (err: any) {
      addToast("error", "Password Change Failed", err?.message || "Invalid current password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLinkGoogleAccount = async () => {
    try {
      await linkProvider("google", "google_credential_id_token");
      addToast("success", "Google Account Linked", "Google OAuth provider has been linked.");
    } catch (err: any) {
      addToast("error", "Link Provider Failed", err?.message);
    }
  };

  const handleUnlinkGoogleAccount = async () => {
    try {
      const updatedUser = await unlinkProvider("google");
      setUser(updatedUser);
      addToast("success", "Provider Unlinked", "Google OAuth provider has been unlinked.");
    } catch (err: any) {
      addToast("error", "Unlink Failed", err?.message);
    }
  };

  const handleTerminateSingleSession = async (id: string) => {
    try {
      await terminateSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      addToast("success", "Session Terminated", "Session has been logged out.");
    } catch (err: any) {
      addToast("error", "Failed to terminate session", err?.message);
    }
  };

  const handleTerminateOthers = async () => {
    try {
      const res = await terminateAllOtherSessions();
      await loadSessions();
      addToast("success", "Sessions Terminated", res.detail);
    } catch (err: any) {
      addToast("error", "Termination Failed", err?.message);
    }
  };

  const handleResendEmail = async () => {
    try {
      const res = await resendEmailVerification();
      addToast("info", "Verification Sent", res.detail);
    } catch (err: any) {
      addToast("error", "Failed to send email", err?.message);
    }
  };

  const handleExportData = async () => {
    try {
      await downloadAccountExport();
      addToast("success", "Data Exported", "Account data JSON file downloaded.");
    } catch (err: any) {
      addToast("error", "Export Failed", err?.message);
    }
  };

  const handleClearHistoryAction = async (type: "chat" | "repository" | "disconnect_repos") => {
    try {
      const res = await clearUserHistory(type);
      addToast("success", "History Cleared", res.detail);
      refreshStats();
    } catch (err: any) {
      addToast("error", "Action Failed", err?.message);
    }
  };

  const handleDeleteAccountFinal = async () => {
    if (deleteConfirmUser.trim().toLowerCase() !== user.username.toLowerCase()) {
      addToast("error", "Username Mismatch", "Typed username does not match.");
      return;
    }
    setIsDeleting(true);
    try {
      await deleteAccount(deleteConfirmUser.trim(), deletePassword);
      addToast("success", "Account Deleted", "Your account has been deleted.");
      onClose();
    } catch (err: any) {
      addToast("error", "Account Deletion Failed", err?.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate password strength score 0..100
  const calculatePasswordStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score += 25;
    if (pwd.length >= 10) score += 25;
    if (/[A-Z]/.test(pwd)) score += 20;
    if (/[0-9]/.test(pwd)) score += 15;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 15;
    return score;
  };

  const passwordStrength = calculatePasswordStrength(newPassword);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-void-950/80 backdrop-blur-md overflow-y-auto select-none">
        <ToastContainer toasts={toasts} onDismiss={removeToast} />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-4xl rounded-2xl bg-void-900 border border-white/[0.08] shadow-2xl overflow-hidden my-auto flex flex-col md:flex-row max-h-[90vh]"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 text-slate-400 hover:text-white transition cursor-pointer p-1.5 rounded-lg bg-void-950/60 border border-white/5 hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Left Navigation Sidebar */}
          <div className="w-full md:w-64 bg-void-950/60 border-b md:border-b-0 md:border-r border-white/[0.06] p-4 flex flex-col shrink-0">
            {/* Header user badge */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-void-900/80 border border-white/[0.05] mb-5">
              <div className="relative h-10 w-10 rounded-full bg-gradient-to-tr from-coral to-violet p-0.5 shrink-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.display_name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <div className="h-full w-full rounded-full bg-void-900 flex items-center justify-center text-slate-200 font-bold text-sm font-display">
                    {user.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-100 font-display truncate">{user.display_name}</h4>
                <p className="text-[11px] text-slate-400 font-mono truncate">@{user.username}</p>
              </div>
            </div>

            <nav className="space-y-1 flex-1">
              {[
                { id: "overview font-display", label: "Account Overview", icon: BarChart3 },
                { id: "profile", label: "Edit Profile", icon: UserIcon },
                { id: "providers", label: "Connected Providers", icon: Globe },
                { id: "security", label: "Security & Sessions", icon: Shield },
                { id: "preferences", label: "Preferences", icon: Sliders },
                { id: "activity", label: "Activity Log", icon: ActivityIcon },
                { id: "privacy", label: "Privacy & Export", icon: Download },
                { id: "danger", label: "Danger Zone", icon: AlertTriangle, color: "text-coral" },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as Tab)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer font-body ${
                      isActive
                        ? "bg-coral/15 text-coral border border-coral/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${item.color || (isActive ? "text-coral" : "text-slate-400")}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-white/[0.06] text-[10px] font-mono text-slate-500 flex items-center justify-between">
              <span>CommitIt Account v1.0</span>
              <span className="text-emerald-400 font-semibold">● Production</span>
            </div>
          </div>

          {/* Main Content Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
            {/* OVERVIEW TAB */}
            {activeTab === "overview font-display" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 font-display">Account Overview</h3>
                  <p className="text-xs text-slate-400 font-body">Personal overview, account status, and repository intelligence stats.</p>
                </div>

                {/* Main SaaS Header Banner */}
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-void-950 via-void-900 to-void-950 p-5 shadow-xl">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-tr from-coral via-magenta to-violet p-0.5 shrink-0 shadow-lg">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.display_name} className="h-full w-full rounded-2xl object-cover" />
                      ) : (
                        <div className="h-full w-full rounded-2xl bg-void-900 flex items-center justify-center text-slate-100 font-bold text-xl font-display">
                          {user.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-slate-100 font-display">{user.display_name}</h4>
                        <span className="text-xs text-slate-400 font-mono">@{user.username}</span>
                        {user.email_verified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                            <Check className="h-3 w-3" /> Verified
                          </span>
                        ) : (
                          <button
                            onClick={handleResendEmail}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono cursor-pointer transition"
                          >
                            <span>Verify Email</span>
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-1">{user.email}</p>

                      <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] text-slate-400 font-mono">
                        <span className="inline-flex items-center gap-1 bg-white/[0.05] px-2.5 py-1 rounded-lg border border-white/5">
                          <Clock className="h-3 w-3 text-coral" />
                          Joined {user.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Recently"}
                        </span>
                        <span className="inline-flex items-center gap-1 bg-white/[0.05] px-2.5 py-1 rounded-lg border border-white/5">
                          <Monitor className="h-3 w-3 text-cyan-400" />
                          Last login: {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "Just now"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real Repository Statistics Cards */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 font-display uppercase tracking-wider mb-3">
                    Repository & Intelligence Metrics
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Repos Imported", value: stats?.repos_imported ?? 0, icon: Database, color: "text-coral" },
                      { label: "Repos Analyzed", value: stats?.repos_analyzed ?? 0, icon: Layers, color: "text-violet" },
                      { label: "Knowledge Models", value: stats?.knowledge_models ?? 0, icon: Sparkles, color: "text-cyan-400" },
                      { label: "Files Indexed", value: stats?.files_indexed ?? 0, icon: FileCode, color: "text-emerald-400" },
                      { label: "Symbols Parsed", value: stats?.symbols_parsed ?? 0, icon: Code2, color: "text-magenta" },
                      { label: "AI Conversations", value: stats?.ai_conversations ?? 0, icon: MessageSquare, color: "text-amber-400" },
                    ].map((stat, idx) => {
                      const Icon = stat.icon;
                      return (
                        <div key={idx} className="p-3.5 rounded-xl bg-void-950/50 border border-white/[0.04]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-semibold text-slate-400 font-body">{stat.label}</span>
                            <Icon className={`h-4 w-4 ${stat.color}`} />
                          </div>
                          <p className="text-xl font-bold text-slate-100 font-display">{stat.value.toLocaleString()}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 font-display">Personal Profile</h3>
                  <p className="text-xs text-slate-400 font-body">Manage your personal identification, username, email, and avatar.</p>
                </div>

                {/* Avatar Section */}
                <div className="flex items-center gap-5 p-4 rounded-xl bg-void-950/50 border border-white/[0.04]">
                  <div className="relative h-16 w-16 rounded-full bg-gradient-to-tr from-coral to-violet p-0.5 shrink-0 shadow-lg">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.display_name} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <div className="h-full w-full rounded-full bg-void-900 flex items-center justify-center text-slate-200 font-bold text-xl font-display">
                        {user.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-200 font-display">Profile Avatar</h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCropperOpen(true)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 bg-white/[0.08] hover:bg-white/[0.14] px-3 py-1.5 rounded-lg border border-white/10 transition cursor-pointer font-body"
                      >
                        <Camera className="h-3.5 w-3.5 text-coral" /> Upload Avatar
                      </button>
                      {user.avatar_url && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="text-xs font-semibold text-coral hover:text-coral-light bg-coral/10 hover:bg-coral/20 px-3 py-1.5 rounded-lg border border-coral/20 transition cursor-pointer font-body"
                        >
                          Remove Avatar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Editable Profile Form */}
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {hasUnsavedProfileChanges && (
                    <div className="flex items-center justify-between p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-body">
                      <span className="flex items-center gap-2 font-semibold">
                        <AlertCircle className="h-4 w-4" /> You have unsaved profile changes
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleResetProfileChanges}
                          className="text-[11px] underline hover:text-white transition cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-body">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.08] bg-void-950/60 py-2.5 px-3.5 text-slate-200 text-sm font-body outline-none focus:border-coral/50 transition"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-body">
                        Username
                      </label>
                      {usernameStatus.loading && <span className="text-[10px] text-slate-500 font-mono">Checking availability...</span>}
                      {usernameStatus.available !== undefined && !usernameStatus.loading && (
                        <span
                          className={`text-[10px] font-mono font-semibold ${
                            usernameStatus.available ? "text-emerald-400" : "text-coral"
                          }`}
                        >
                          {usernameStatus.message}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={`w-full rounded-xl border bg-void-950/60 py-2.5 px-3.5 text-slate-200 text-sm font-mono outline-none transition ${
                        usernameStatus.available === false ? "border-coral/50" : "border-white/[0.08] focus:border-coral/50"
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-body">
                        Email Address
                      </label>
                      {emailStatus.loading && <span className="text-[10px] text-slate-500 font-mono">Checking availability...</span>}
                      {emailStatus.available !== undefined && !emailStatus.loading && (
                        <span
                          className={`text-[10px] font-mono font-semibold ${
                            emailStatus.available ? "text-emerald-400" : "text-coral"
                          }`}
                        >
                          {emailStatus.message}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full rounded-xl border bg-void-950/60 py-2.5 pl-10 pr-3 text-slate-200 text-sm font-body outline-none transition ${
                          emailStatus.available === false ? "border-coral/50" : "border-white/[0.08] focus:border-coral/50"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSavingProfile || !hasUnsavedProfileChanges}
                      className="rounded-xl bg-coral hover:bg-coral-light disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 text-xs font-bold text-white transition cursor-pointer font-body border border-coral/30"
                    >
                      {isSavingProfile ? "Saving..." : "Save Changes"}
                    </button>
                    {hasUnsavedProfileChanges && (
                      <button
                        type="button"
                        onClick={handleResetProfileChanges}
                        className="rounded-xl bg-white/[0.08] hover:bg-white/[0.14] px-4 py-2.5 text-xs font-semibold text-slate-300 transition cursor-pointer font-body"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* CONNECTED PROVIDERS TAB */}
            {activeTab === "providers" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 font-display">Connected Providers</h3>
                  <p className="text-xs text-slate-400 font-body">Manage OAuth identity providers linked to your account.</p>
                </div>

                <div className="space-y-3">
                  {/* Local Email */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-void-950/50 border border-white/[0.05]">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-coral/10 border border-coral/20 flex items-center justify-center text-coral">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200 font-display">Local Email Credentials</h4>
                        <p className="text-[11px] text-slate-400 font-mono">{user.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full font-mono border border-emerald-500/20">
                      Primary Provider
                    </span>
                  </div>

                  {/* Google OAuth */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-void-950/50 border border-white/[0.05]">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200 font-display">Google OAuth 2.0</h4>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {user.google_id ? `Linked (ID: ${user.google_id.substring(0, 12)}...)` : "Not linked"}
                        </p>
                      </div>
                    </div>

                    {user.google_id || user.provider === "google" || user.connected_providers?.includes("google") ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full font-mono border border-sky-500/20">
                          Linked
                        </span>
                        <button
                          type="button"
                          onClick={handleUnlinkGoogleAccount}
                          className="text-[11px] font-semibold text-coral hover:text-coral-light bg-coral/10 hover:bg-coral/20 px-3 py-1 rounded-lg border border-coral/20 transition cursor-pointer font-body"
                        >
                          Unlink
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleLinkGoogleAccount}
                        className="text-[11px] font-semibold text-slate-200 bg-white/[0.08] hover:bg-white/[0.14] px-3.5 py-1.5 rounded-lg border border-white/10 transition cursor-pointer font-body"
                      >
                        Link Google
                      </button>
                    )}
                  </div>

                  {/* GitHub (Coming Soon - Non-interactive) */}
                  <div
                    className="flex items-center justify-between p-4 rounded-xl bg-void-950/30 border border-white/[0.03] opacity-80"
                    title="GitHub OAuth repository synchronization is planned for a future update"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-400">
                        <Globe className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-300 font-display">GitHub Account</h4>
                        <p className="text-[11px] text-slate-500 font-mono">OAuth repository synchronization</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        disabled
                        type="button"
                        title="GitHub OAuth repository synchronization is planned for a future release"
                        className="text-[11px] font-semibold text-slate-500 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/5 cursor-not-allowed select-none opacity-60"
                      >
                        Link GitHub
                      </button>
                      <span
                        className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full font-mono border border-amber-500/20 cursor-help"
                        title="GitHub OAuth repository synchronization is planned for a future update"
                      >
                        Coming Soon
                      </span>
                    </div>
                  </div>

                  {/* Microsoft (Coming Soon) */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-void-950/30 border border-white/[0.03]">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-300">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-300 font-display">Microsoft Account</h4>
                        <p className="text-[11px] text-slate-500 font-mono">Azure AD / Work identity</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 bg-white/[0.06] px-2.5 py-1 rounded-full font-mono border border-white/10">
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 font-display">Security & Sessions</h3>
                  <p className="text-xs text-slate-400 font-body">Manage authentication credentials, password strength, and active sessions.</p>
                </div>

                {/* Change Password */}
                <div className="p-4 rounded-xl bg-void-950/50 border border-white/[0.05] space-y-4">
                  <h4 className="text-xs font-bold text-slate-200 font-display flex items-center gap-2">
                    <Key className="h-4 w-4 text-magenta" /> Change Account Password
                  </h4>

                  <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
                    <div>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Current password"
                        className="w-full rounded-xl border border-white/[0.08] bg-void-900 py-2.5 px-3 text-slate-200 text-xs font-body outline-none focus:border-magenta/50 transition"
                      />
                    </div>

                    <div>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (min 6 chars)"
                        className="w-full rounded-xl border border-white/[0.08] bg-void-900 py-2.5 px-3 text-slate-200 text-xs font-body outline-none focus:border-magenta/50 transition"
                      />

                      {/* Password strength meter */}
                      {newPassword && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                            <span>Password Strength:</span>
                            <span
                              className={`font-semibold ${
                                passwordStrength >= 70 ? "text-emerald-400" : passwordStrength >= 40 ? "text-amber-400" : "text-coral"
                              }`}
                            >
                              {passwordStrength >= 70 ? "Strong" : passwordStrength >= 40 ? "Medium" : "Weak"}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-void-900 rounded-full overflow-hidden border border-white/5">
                            <div
                              className={`h-full transition-all duration-300 ${
                                passwordStrength >= 70
                                  ? "bg-emerald-400"
                                  : passwordStrength >= 40
                                  ? "bg-amber-400"
                                  : "bg-coral"
                              }`}
                              style={{ width: `${passwordStrength}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full rounded-xl border border-white/[0.08] bg-void-900 py-2.5 px-3 text-slate-200 text-xs font-body outline-none focus:border-magenta/50 transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isChangingPassword || !currentPassword || !newPassword}
                      className="rounded-xl bg-magenta/20 hover:bg-magenta/30 disabled:opacity-50 border border-magenta/30 px-4 py-2 text-xs font-semibold text-magenta-light transition cursor-pointer font-body"
                    >
                      {isChangingPassword ? "Updating Password..." : "Update Password"}
                    </button>
                  </form>
                </div>

                {/* Active Sessions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 font-display flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-violet" /> Active Login Sessions ({sessions.length})
                    </h4>
                    {sessions.length > 1 && (
                      <button
                        type="button"
                        onClick={handleTerminateOthers}
                        className="text-[11px] font-semibold text-coral hover:text-coral-light transition cursor-pointer font-body"
                      >
                        Terminate All Other Sessions
                      </button>
                    )}
                  </div>

                  {isLoadingSessions ? (
                    <div className="p-4 text-center text-xs text-slate-500 font-mono">Loading active sessions...</div>
                  ) : sessions.length === 0 ? (
                    <div className="p-4 rounded-xl bg-void-950/40 border border-white/[0.04] text-xs text-slate-400 font-body">
                      No additional sessions recorded.
                    </div>
                  ) : (
                    sessions.map((sess) => (
                      <div
                        key={sess.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-void-950/50 border border-white/[0.05]"
                      >
                        <div className="flex items-center gap-3">
                          {sess.device === "Mobile" ? (
                            <Smartphone className="h-5 w-5 text-cyan-400" />
                          ) : (
                            <Laptop className="h-5 w-5 text-violet" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-bold text-slate-200 font-display">
                                {sess.browser} on {sess.os}
                              </h5>
                              {sess.is_current && (
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono border border-emerald-500/20">
                                  Current Device
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              IP: {sess.ip_address || "127.0.0.1"} • Last Active: {new Date(sess.last_active_at).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {!sess.is_current && (
                          <button
                            type="button"
                            onClick={() => handleTerminateSingleSession(sess.id)}
                            className="text-[11px] text-slate-400 hover:text-coral bg-white/[0.04] hover:bg-coral/10 px-2.5 py-1 rounded-lg border border-white/5 transition cursor-pointer font-body"
                          >
                            Terminate
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* PREFERENCES TAB */}
            {activeTab === "preferences" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 font-display">Account Preferences & Notifications</h3>
                  <p className="text-xs text-slate-400 font-body">Customize application theme, views, and notification alerts.</p>
                </div>

                <div className="space-y-4">
                  {/* Theme Selection */}
                  <div className="p-4 rounded-xl bg-void-950/50 border border-white/[0.05]">
                    <label className="block text-xs font-bold text-slate-200 font-display mb-2">Interface Theme</label>
                    <div className="grid grid-cols-3 gap-3">
                      {["dark", "light", "system"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => updatePreferences({ theme: t })}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize border transition cursor-pointer font-body ${
                            preferences?.theme === t
                              ? "border-coral text-coral bg-coral/10"
                              : "border-white/5 text-slate-400 bg-void-900 hover:text-slate-200"
                          }`}
                        >
                          {t} Theme
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div className="p-4 rounded-xl bg-void-950/50 border border-white/[0.05]">
                    <label className="block text-xs font-bold text-slate-200 font-display mb-2">Accent Color</label>
                    <div className="flex flex-wrap gap-3">
                      {["indigo", "cyan", "emerald", "purple", "amber", "coral"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updatePreferences({ accent_color: c })}
                          className={`py-1.5 px-3 rounded-lg text-xs font-semibold capitalize border transition cursor-pointer font-mono ${
                            preferences?.accent_color === c
                              ? "border-coral text-coral bg-coral/10"
                              : "border-white/5 text-slate-400 bg-void-900 hover:text-slate-200"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Motion & Compact Mode */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-void-950/50 border border-white/[0.05] flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200 font-body">Reduced Motion</span>
                      <input
                        type="checkbox"
                        checked={preferences?.reduced_motion ?? false}
                        onChange={(e) => updatePreferences({ reduced_motion: e.target.checked })}
                        className="h-4 w-4 accent-coral cursor-pointer"
                      />
                    </div>
                    <div className="p-3.5 rounded-xl bg-void-950/50 border border-white/[0.05] flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200 font-body">Compact UI Mode</span>
                      <input
                        type="checkbox"
                        checked={preferences?.compact_mode ?? false}
                        onChange={(e) => updatePreferences({ compact_mode: e.target.checked })}
                        className="h-4 w-4 accent-coral cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Working Notification Toggles */}
                  <div className="p-4 rounded-xl bg-void-950/50 border border-white/[0.05] space-y-3">
                    <h4 className="text-xs font-bold text-slate-200 font-display flex items-center gap-2">
                      <Bell className="h-4 w-4 text-cyan-400" /> Working Notification Settings
                    </h4>

                    {[
                      { key: "notify_security_alerts", label: "Security Alerts & Login Notifications" },
                      { key: "notify_product_updates", label: "Product Feature Updates & Announcements" },
                      { key: "notify_repo_analysis", label: "Repository Analysis Completed Notifications" },
                      { key: "notify_weekly_summary", label: "Weekly Intelligence Summary Emails" },
                      { key: "notify_ai_tips", label: "AI Insights & Architecture Tips" },
                    ].map((n) => (
                      <div key={n.key} className="flex items-center justify-between py-1">
                        <span className="text-xs text-slate-300 font-body">{n.label}</span>
                        <input
                          type="checkbox"
                          checked={(preferences as any)?.[n.key] ?? false}
                          onChange={(e) => updatePreferences({ [n.key]: e.target.checked })}
                          className="h-4 w-4 accent-coral cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ACTIVITY TIMELINE TAB */}
            {activeTab === "activity" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100 font-display">Activity Timeline</h3>
                    <p className="text-xs text-slate-400 font-body">Audit log of your recent account actions and security events.</p>
                  </div>
                  <button
                    type="button"
                    onClick={loadActivity}
                    className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] px-3 py-1.5 rounded-lg transition cursor-pointer font-body border border-white/5"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-coral" /> Refresh
                  </button>
                </div>

                {isLoadingActivity ? (
                  <div className="p-8 text-center text-xs text-slate-500 font-mono">Loading activity log...</div>
                ) : activities.length === 0 ? (
                  <div className="p-6 rounded-xl bg-void-950/40 border border-white/[0.04] text-center text-xs text-slate-400 font-body">
                    No recent activity recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2.5 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
                    {activities.map((act) => (
                      <div key={act.id} className="relative pl-8 flex items-start justify-between p-3 rounded-xl bg-void-950/50 border border-white/[0.04]">
                        <div className="absolute left-2.5 top-4 h-3 w-3 rounded-full bg-coral border-2 border-void-900" />
                        <div>
                          <h5 className="text-xs font-bold text-slate-200 font-display capitalize">
                            {act.action.replace("_", " ")}
                          </h5>
                          <p className="text-[11px] text-slate-400 font-body mt-0.5">{act.description}</p>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                          {new Date(act.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PRIVACY & EXPORT TAB */}
            {activeTab === "privacy" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 font-display">Privacy & Data Management</h3>
                  <p className="text-xs text-slate-400 font-body">Download account exports or clear specific history records.</p>
                </div>

                <div className="space-y-4">
                  {/* Export Account Data */}
                  <div className="p-4 rounded-xl bg-void-950/50 border border-white/[0.05] space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200 font-display flex items-center gap-2">
                          <Download className="h-4 w-4 text-emerald-400" /> Export Account Data
                        </h4>
                        <p className="text-[11px] text-slate-400 font-body mt-0.5">
                          Download a complete JSON export of profile metadata, preferences, sessions, and activity.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleExportData}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 px-3.5 py-2 rounded-xl transition cursor-pointer font-body"
                      >
                        <Download className="h-3.5 w-3.5 text-emerald-400" /> Download JSON
                      </button>
                    </div>
                  </div>

                  {/* Clear Chat History */}
                  <div className="p-4 rounded-xl bg-void-950/50 border border-white/[0.05] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 font-display">Clear AI Chat History</h4>
                      <p className="text-[11px] text-slate-400 font-body">Permanently remove all recorded AI chat conversation threads.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleClearHistoryAction("chat")}
                      className="text-xs font-semibold text-coral bg-coral/10 hover:bg-coral/20 border border-coral/20 px-3.5 py-2 rounded-xl transition cursor-pointer font-body"
                    >
                      Clear Chat History
                    </button>
                  </div>

                  {/* Clear Repository History */}
                  <div className="p-4 rounded-xl bg-void-950/50 border border-white/[0.05] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 font-display">Clear Analysis History</h4>
                      <p className="text-[11px] text-slate-400 font-body">Reset historical repository analysis runs and trend snapshots.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleClearHistoryAction("repository")}
                      className="text-xs font-semibold text-coral bg-coral/10 hover:bg-coral/20 border border-coral/20 px-3.5 py-2 rounded-xl transition cursor-pointer font-body"
                    >
                      Clear Analysis Runs
                    </button>
                  </div>

                  {/* Disconnect Repos */}
                  <div className="p-4 rounded-xl bg-void-950/50 border border-white/[0.05] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 font-display">Disconnect Imported Repositories</h4>
                      <p className="text-[11px] text-slate-400 font-body">Remove all user imported repository ownership associations.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleClearHistoryAction("disconnect_repos")}
                      className="text-xs font-semibold text-coral bg-coral/10 hover:bg-coral/20 border border-coral/20 px-3.5 py-2 rounded-xl transition cursor-pointer font-body"
                    >
                      Disconnect All Repos
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DANGER ZONE TAB */}
            {activeTab === "danger" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-coral font-display flex items-center gap-2">
                    <Trash2 className="h-5 w-5" /> Danger Zone
                  </h3>
                  <p className="text-xs text-slate-400 font-body">Permanent actions that affect your account data irreversible.</p>
                </div>

                <div className="p-5 rounded-2xl bg-coral/10 border border-coral/30 space-y-4">
                  <h4 className="text-sm font-bold text-coral font-display">Delete User Account</h4>
                  <p className="text-xs text-slate-300 font-body leading-relaxed">
                    Permanently delete your account, session records, preferences, repository ownership, analysis runs, and AI conversations. This action cannot be undone.
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowFinalDeleteModal(true)}
                    className="rounded-xl bg-coral hover:bg-coral-light px-5 py-2.5 text-xs font-bold text-white transition cursor-pointer font-body shadow-lg shadow-coral/20"
                  >
                    Delete Account...
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Final Delete Warning Dialog */}
        {showFinalDeleteModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-void-950/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl bg-void-900 border border-coral/40 p-6 shadow-2xl space-y-4"
            >
              <h4 className="text-base font-bold text-coral font-display flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Confirm Account Deletion
              </h4>
              <p className="text-xs text-slate-300 font-body">
                Please type your username <strong className="text-white font-mono">@{user.username}</strong> below to confirm permanent account deletion.
              </p>

              <div className="space-y-3">
                <input
                  type="text"
                  value={deleteConfirmUser}
                  onChange={(e) => setDeleteConfirmUser(e.target.value)}
                  placeholder={`Type "${user.username}" to confirm`}
                  className="w-full rounded-xl border border-white/10 bg-void-950 py-2.5 px-3 text-slate-200 font-mono text-xs outline-none focus:border-coral transition"
                />

                {user.password_hash && (
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full rounded-xl border border-white/10 bg-void-950 py-2.5 px-3 text-slate-200 font-body text-xs outline-none focus:border-coral transition"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFinalDeleteModal(false)}
                  className="rounded-xl bg-white/[0.08] hover:bg-white/[0.14] px-4 py-2 text-xs font-semibold text-slate-300 transition cursor-pointer font-body"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting || deleteConfirmUser.trim().toLowerCase() !== user.username.toLowerCase()}
                  onClick={handleDeleteAccountFinal}
                  className="rounded-xl bg-coral hover:bg-coral-light disabled:opacity-50 px-5 py-2 text-xs font-bold text-white transition cursor-pointer font-body"
                >
                  {isDeleting ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Avatar Cropper Modal */}
        <AvatarCropperModal
          isOpen={isCropperOpen}
          onClose={() => setIsCropperOpen(false)}
          onSaveAvatar={handleAvatarSave}
        />
      </div>
    </AnimatePresence>
  );
};
