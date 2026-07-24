import { useState, useEffect } from "react";
import { AnimatedBackground } from "@/components/background";
import { Hero } from "@/components/hero";
import { UniversePage } from "@/pages/UniversePage";
import { DashboardPage } from "@/pages/DashboardPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { GitBranch, ChevronDown, LayoutDashboard, Globe, Settings, LogOut } from "lucide-react";

type View = "landing" | "universe" | "dashboard" | "login" | "register";

function AppContent() {
  const [view, setView] = useState<View>("landing");
  const [repositoryId, setRepositoryId] = useState<string | null>(() => localStorage.getItem("repositoryId"));
  const { user, logout, loading } = useAuth();
  
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

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

  function handleAnalysisComplete(id: string) {
    setRepositoryId(id);
    localStorage.setItem("repositoryId", id);
    setView("universe");
  }

  // Handle auto-routing based on authentication state
  useEffect(() => {
    if (user) {
      if (view === "login" || view === "register") {
        setView(repositoryId ? "dashboard" : "landing");
      }
    } else {
      if (view === "universe" || view === "dashboard") {
        setView("landing");
      }
    }
  }, [user, repositoryId]);

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
        {/* Left: Brand logo & WORKSPACE label */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => setView("landing")}
            className="flex items-center gap-2.5 cursor-pointer select-none group transition duration-150"
          >
            <div className="relative flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-coral to-magenta text-void-950 font-bold shadow-[0_0_20px_rgba(255,107,82,0.35)] group-hover:scale-105 transition-transform duration-200">
              <GitBranch className="h-4.5 w-4.5 text-void-950" />
            </div>
            <span className="text-lg font-black bg-gradient-to-r from-coral via-magenta to-violet bg-clip-text text-transparent tracking-tight font-display">
              CommitIt
            </span>
          </div>

          <span className="text-white/10 font-mono text-sm select-none">|</span>
          
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.04]">
            <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              WORKSPACE
            </span>
          </div>
        </div>

        {/* Right: Dashboard Action + Unified User Pill Dropdown */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {repositoryId && view === "universe" && (
                <button
                  onClick={() => setView("dashboard")}
                  className="flex items-center gap-2 text-xs font-bold text-coral hover:text-coral-light border border-coral/30 hover:border-coral/60 bg-coral/10 hover:bg-coral/20 py-1.5 px-3.5 rounded-xl transition-all duration-200 outline-none cursor-pointer shadow-[0_0_15px_rgba(255,107,82,0.15)] active:scale-95"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>View Dashboard</span>
                </button>
              )}
              {repositoryId && view === "dashboard" && (
                <button
                  onClick={() => setView("universe")}
                  className="flex items-center gap-2 text-xs font-bold text-slate-200 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] py-1.5 px-3.5 rounded-xl transition-all duration-200 outline-none cursor-pointer active:scale-95"
                >
                  <Globe className="h-3.5 w-3.5 text-cyan" />
                  <span>Back to Universe</span>
                </button>
              )}

              {/* Unified User Avatar Dropdown Pill */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  aria-haspopup="true"
                  aria-expanded={isProfileDropdownOpen}
                  className="flex items-center gap-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 rounded-full p-1 pr-3 transition duration-200 cursor-pointer outline-none active:scale-95 group"
                >
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-coral to-magenta flex items-center justify-center text-[10px] font-black text-void-950 uppercase shadow-inner">
                    {user.username.substring(0, 2)}
                  </div>
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors duration-150">
                    {user.username}
                  </span>
                  <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${isProfileDropdownOpen ? "rotate-180 text-coral" : "group-hover:text-slate-200"}`} />
                </button>

                {isProfileDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsProfileDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-3 w-60 origin-top-right rounded-2xl border border-white/[0.08] bg-void-900/90 backdrop-blur-2xl p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.6)] z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-3.5 py-3 rounded-xl bg-white/[0.02]">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Logged in as</p>
                        <p className="text-xs font-bold text-ink truncate mt-0.5 font-display">{user.username}</p>
                      </div>
                      
                      <div className="border-t border-white/[0.06] my-1" />

                      <button
                        disabled
                        className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-left text-xs text-slate-500 cursor-not-allowed font-medium opacity-60"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        <span>Profile Settings</span>
                      </button>

                      <div className="border-t border-white/[0.06] my-1" />

                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          logout().then(() => {
                            localStorage.removeItem("repositoryId");
                            setRepositoryId(null);
                            setView("landing");
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
                onClick={() => setView("login")}
                className="text-xs font-bold text-slate-300 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] py-1.5 px-3.5 rounded-xl transition duration-200 outline-none cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={() => setView("register")}
                className="text-xs font-bold text-coral hover:text-coral-light border border-coral/30 hover:border-coral/60 bg-coral/10 hover:bg-coral/20 py-1.5 px-3.5 rounded-xl transition duration-200 outline-none cursor-pointer"
              >
                Register
              </button>
            </>
          )}
        </div>
      </header>

      <main className="relative z-10 pt-20">
        {view === "landing" && (
          <Hero
            onAnalysisComplete={handleAnalysisComplete}
            onLoginRedirect={() => setView("login")}
          />
        )}
        {view === "login" && <LoginPage onToggleRegister={() => setView("register")} />}
        {view === "register" && <RegisterPage onToggleLogin={() => setView("login")} />}
        {view === "universe" && repositoryId && (
          <UniversePage repositoryId={repositoryId} />
        )}
        {view === "dashboard" && repositoryId && (
          <DashboardPage repositoryId={repositoryId} onViewUniverse={() => setView("universe")} />
        )}
      </main>
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