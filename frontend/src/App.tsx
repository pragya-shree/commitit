import { useState } from "react";
import { AnimatedBackground } from "@/components/background";
import { Hero } from "@/components/hero";
import { UniversePage } from "@/pages/UniversePage";
import { DashboardPage } from "@/pages/DashboardPage";

type View = "landing" | "universe" | "dashboard";

function App() {
  const [view, setView] = useState<View>("landing");
  const [repositoryId, setRepositoryId] = useState<string | null>(null);

  function handleAnalysisComplete(id: string) {
    setRepositoryId(id);
    setView("universe");
  }

  return (
    <>
      <AnimatedBackground />
      <main className="relative z-10">
        {view === "landing" && <Hero onAnalysisComplete={handleAnalysisComplete} />}
        {view === "universe" && repositoryId && (
          <UniversePage repositoryId={repositoryId} onViewDashboard={() => setView("dashboard")} />
        )}
        {view === "dashboard" && repositoryId && (
          <DashboardPage repositoryId={repositoryId} onBack={() => setView("universe")} />
        )}
      </main>
    </>
  );
}

export default App;