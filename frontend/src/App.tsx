import { useState } from "react";
import { AnimatedBackground } from "@/components/background";
import { Hero } from "@/components/hero";
import { UniversePage } from "@/pages/UniversePage";
import { DashboardPage } from "@/pages/DashboardPage";

type View = "landing" | "universe" | "dashboard";

function App() {
  const [view, setView] = useState<View>("landing");

  return (
    <>
      <AnimatedBackground />
      <main className="relative z-10">
        {view === "landing" && <Hero onAnalysisComplete={() => setView("universe")} />}
        {view === "universe" && <UniversePage onViewDashboard={() => setView("dashboard")} />}
        {view === "dashboard" && <DashboardPage onBack={() => setView("universe")} />}
      </main>
    </>
  );
}

export default App;
