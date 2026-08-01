import { useState, useEffect } from "react";
import { AnimatedBackground } from "@/components/background";
import { Hero } from "@/components/hero";
import { UniversePage } from "@/pages/UniversePage";
import { DashboardPage } from "@/pages/DashboardPage";
import { AssistantPage } from "@/pages/AssistantPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { UserProfileModal } from "@/components/auth/UserProfileModal";
import { WelcomeOnboardingModal } from "@/components/auth/WelcomeOnboardingModal";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { getKnowledge } from "@/services/api";
import {
  GitBranch,
  ChevronDown,
  LayoutDashboard,
  Globe,
  Settings,
  LogOut,
  Sparkles,
  FolderSync,
} from "lucide-react";

export type AppMode = "LANDING" | "WORKSPACE";

export interface ActiveRepository {
  id: string;
  name: string;
  owner?: string | null;
}

type View = "landing" | "universe" | "dashboard" | "assistant" | "login" | "register";

function AppContent() {
  const [activeRepository, setActiveRepository] = useState<ActiveRepository | null>(() => {
    const id = localStorage.getItem("repositoryId");
    if (!id) return null;
    const name = localStorage.getItem("repositoryName") || id;
    return { id, name };
  });

  const appMode: AppMode = activeRepository ? "WORKSPACE" : "LANDING";

  const [view, setView] = useState<View>(() => {
    const savedId = localStorage.getItem("repositoryId");
    if (savedId) {
      const savedView = localStorage.getItem("workspaceView") as View;
      if (savedView === "dashboard" || savedView === "universe" || savedView === "assistant") {
        return savedView;
      }
      return "universe";
    }
    return "landing";
  });

  const { user, logout, loading } = useAuth();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  useEffect(() => {
    if (user && !localStorage.getItem("hasCompletedOnboarding")) {
      setShowOnboardingModal(true);
    }
  }, [user]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsProfileDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch / update clean repository name if activeRepository exists
  useEffect(() => {
    if (!activeRepository?.id) return;
    let isMounted = true;
    getKnowledge(activeRepository.id)
      .then((res) => {
        if (isMounted && res?.knowledge?.repository?.name) {
          const fetchedName = res.knowledge.repository.name;
          if (fetchedName && fetchedName !== activeRepository.name) {
            const updated = {
              ...activeRepository,
              name: fetchedName,
              owner: res.knowledge.repository.owner,
            };
            setActiveRepository(updated);
            localStorage.setItem("repositoryName", fetchedName);
          }
        }
      })
      .catch(() => {
        // Silently handle background metadata fetch error
      });
    return () => {
      isMounted = false;
    };
  }, [activeRepository?.id]);

  function handleSetView(nextView: View) {
    setView(nextView);
    if (activeRepository && (nextView === "dashboard" || nextView === "universe" || nextView === "assistant")) {
      localStorage.setItem("workspaceView", nextView);
    }
  }

  function handleAnalysisComplete(id: string, metadata?: { name: string; owner?: string }) {
    const repoName = metadata?.name || "repository";
    const repo: ActiveRepository = {
      id,
      name: repoName,
      owner: metadata?.owner,
    };
    setActiveRepository(repo);
    localStorage.setItem("repositoryId", id);
    localStorage.setItem("repositoryName", repoName);

    // Direct entry into Repository Universe after analysis as requested
    setView("universe");
    localStorage.setItem("workspaceView", "universe");
  }

  function handleSwitchRepository() {
    localStorage.removeItem("repositoryId");
    localStorage.removeItem("repositoryName");
    localStorage.removeItem("workspaceView");
    setActiveRepository(null);
    setView("landing");
  }

  // Handle auto-routing based on authentication state
  useEffect(() => {
    if (user) {
      if (view === "login" || view === "register") {
        setView(activeRepository ? "dashboard" : "landing");
      }
    } else {
      if (view === "universe" || view === "dashboard" || view === "assistant") {
        setView("landing");
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-800 border-t-cyan-500"></div>
            <div className="absolute h-10 w-10 animate-ping rounded-full bg-cyan-500/20"></div>
          </div>
          <p className="text-cyan-400/90 text-sm font-semibold tracking-wider uppercase animate-pulse">
            Resolving session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatedBackground />

      {/* Floating Glass Boxed Header */}
      <header className="fixed top-4 left-4 right-4 sm:left-6 sm:right-6 z-50 flex items-center justify-between px-6 py-3 rounded-2xl bg-void-900/60 backdrop-blur-xl border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-all duration-300">
        {/* Left: Brand logo & Context Indicator */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => handleSetView(appMode === "WORKSPACE" ? "dashboard" : "landing")}
            className="flex items-center gap-2.5 cursor-pointer select-none group transition duration-150"
          >
            <div className="relative flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-coral to-magenta text-void-950 font-bold shadow-[0_0_20px_rgba(255,107,82,0.35)] group-hover:scale-105 transition-transform duration-200">
              <GitBranch className="h-4.5 w-4.5 text-void-950" />
            </div>
            <span className="text-lg font-black bg-gradient-to-r from-coral via-magenta to-violet bg-clip-text text-transparent tracking-tight font-display">
              CommitIt
            </span>
          </div>

          {/* WORKSPACE Mode Badge & Active Repository Indicator */}
          {user && activeRepository && (
            <>
              <span className="text-white/10 font-mono text-sm select-none">|</span>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs shadow-inner">
                <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse" />
                <span className="font-bold text-slate-400 uppercase tracking-widest font-mono text-[10px]">
                  WORKSPACE
                </span>
                <span className="text-slate-600 font-mono">•</span>
                <span
                  className="font-semibold text-slate-200 font-display tracking-tight max-w-[140px] sm:max-w-[200px] truncate"
                  title={activeRepository.name}
                >
                  {activeRepository.name}
                </span>
                <button
                  onClick={handleSwitchRepository}
                  className="ml-1 p-0.5 text-slate-400 hover:text-coral transition-colors rounded hover:bg-white/[0.08] cursor-pointer"
                  title="Switch or clear active repository"
                >
                  <FolderSync className="h-3 w-3" />
                </button>
              </div>
            </>
          )}
        </div>

          {/* Center / Right: Workspace Tabs & Profile Pill */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Navigation Tabs (Rendered ONLY after a repository has been loaded) */}
                {activeRepository && (
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <button
                      onClick={() => handleSetView("dashboard")}
                      className={`flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-lg transition-all duration-150 cursor-pointer ${
                        view === "dashboard"
                          ? "bg-coral/20 border border-coral/40 text-coral shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      <span>Dashboard</span>
                    </button>

                    <button
                      onClick={() => handleSetView("universe")}
                      className={`flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-lg transition-all duration-150 cursor-pointer ${
                        view === "universe"
                          ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>Universe</span>
                    </button>

                    <button
                      onClick={() => handleSetView("assistant")}
                      className={`flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-lg transition-all duration-150 cursor-pointer ${
                        view === "assistant"
                          ? "bg-gradient-to-r from-coral/20 to-magenta/20 border border-coral/40 text-coral shadow-[0_0_15px_rgba(255,107,82,0.2)]"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-coral" />
                      <span>AI Assistant</span>
                    </button>
                  </div>
                )}

              {/* User Avatar Dropdown Pill */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  aria-haspopup="true"
                  aria-expanded={isProfileDropdownOpen}
                  className="flex items-center gap-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 rounded-full p-1 pr-3 transition duration-200 cursor-pointer outline-none active:scale-95 group"
                >
                  <div className="relative h-6 w-6 rounded-full bg-gradient-to-br from-coral to-magenta p-0.5 shrink-0 overflow-hidden">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.display_name} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <div className="h-full w-full rounded-full bg-void-950 flex items-center justify-center text-[10px] font-black text-slate-200 uppercase">
                        {user.username.substring(0, 2)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors duration-150">
                    {user.username}
                  </span>
                  <ChevronDown
                    className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
                      isProfileDropdownOpen ? "rotate-180 text-coral" : "group-hover:text-slate-200"
                    }`}
                  />
                </button>

                {isProfileDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsProfileDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-3 w-60 origin-top-right rounded-2xl border border-white/[0.08] bg-void-900/90 backdrop-blur-2xl p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.6)] z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/[0.02]">
                        <div className="relative h-9 w-9 rounded-full bg-gradient-to-tr from-coral to-violet p-0.5 shrink-0">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.display_name} className="h-full w-full rounded-full object-cover" />
                          ) : (
                            <div className="h-full w-full rounded-full bg-void-900 flex items-center justify-center text-slate-200 font-bold text-xs font-display">
                              {user.display_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                            Logged in as
                          </p>
                          <p className="text-xs font-bold text-slate-100 truncate font-display">
                            {user.display_name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate font-mono">
                            @{user.username}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-white/[0.06] my-1" />

                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          setShowUserProfileModal(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-left text-xs font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white transition duration-150 cursor-pointer font-medium"
                      >
                        <Settings className="h-3.5 w-3.5 text-coral" />
                        <span>Profile Settings</span>
                      </button>

                      {appMode === "WORKSPACE" && (
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            handleSwitchRepository();
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-left text-xs font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white transition duration-150 cursor-pointer"
                        >
                          <FolderSync className="h-3.5 w-3.5 text-cyan-400" />
                          <span>Switch Repository</span>
                        </button>
                      )}

                      <div className="border-t border-white/[0.06] my-1" />

                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          logout().then(() => {
                            handleSwitchRepository();
                          });
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-left text-xs font-semibold text-coral hover:bg-coral/10 transition duration-150 cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => handleSetView("login")}
                className="text-xs font-bold text-slate-300 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] py-1.5 px-3.5 rounded-xl transition duration-200 outline-none cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={() => handleSetView("register")}
                className="text-xs font-bold text-coral hover:text-coral-light border border-coral/30 hover:border-coral/60 bg-coral/10 hover:bg-coral/20 py-1.5 px-3.5 rounded-xl transition duration-200 outline-none cursor-pointer"
              >
                Register
              </button>
            </>
          )}
        </div>
      </header>

      <main className="relative z-10 pt-20">
        {view === "login" && <LoginPage onToggleRegister={() => handleSetView("register")} />}
        {view === "register" && <RegisterPage onToggleLogin={() => handleSetView("login")} />}

        {/* Landing Hero View */}
        {view === "landing" && (
          <Hero
            onAnalysisComplete={handleAnalysisComplete}
            onLoginRedirect={() => handleSetView("login")}
          />
        )}

        {/* Workspace Views */}
        {view !== "login" && view !== "register" && view !== "landing" && (
          <>
            {view === "dashboard" && (
              <DashboardPage
                repositoryId={activeRepository?.id}
                onViewUniverse={() => handleSetView("universe")}
                onSelectRepository={(id, name) => {
                  handleAnalysisComplete(id, { name });
                  handleSetView("dashboard");
                }}
                onOpenAssistant={() => {
                  handleSetView("assistant");
                }}
                onOpenUniverse={(repoId) => {
                  if (activeRepository?.id !== repoId) {
                    handleAnalysisComplete(repoId, { name: repoId });
                  }
                  handleSetView("universe");
                }}
                onImportRepoClick={() => handleSetView("landing")}
              />
            )}
            {view === "universe" && activeRepository && (
              <UniversePage repositoryId={activeRepository.id} />
            )}
            {view === "assistant" && activeRepository && (
              <AssistantPage
                repositoryId={activeRepository.id}
                onNavigateToUniverse={() => handleSetView("universe")}
              />
            )}
          </>
        )}
      </main>

      {showUserProfileModal && (
        <UserProfileModal onClose={() => setShowUserProfileModal(false)} />
      )}

      {showOnboardingModal && (
        <WelcomeOnboardingModal
          onClose={() => setShowOnboardingModal(false)}
          onImportRepo={() => handleSetView("landing")}
        />
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;