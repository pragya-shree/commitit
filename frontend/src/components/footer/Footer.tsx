import React from "react";
import { GitBranch, Mail, ExternalLink } from "lucide-react";

export interface FooterProps {
  onNavigate?: (view: "landing" | "dashboard" | "universe" | "assistant") => void;
  activeRepositoryId?: string | null;
}

const GithubIcon: React.FC<{ className?: string }> = ({ className = "h-4.5 w-4.5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

const LinkedinIcon: React.FC<{ className?: string }> = ({ className = "h-4.5 w-4.5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

const InstagramIcon: React.FC<{ className?: string }> = ({ className = "h-4.5 w-4.5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
    />
  </svg>
);

export const Footer: React.FC<FooterProps> = ({ onNavigate, activeRepositoryId }) => {
  const handleProductClick = (targetView: "dashboard" | "universe" | "assistant") => {
    if (onNavigate) {
      if (activeRepositoryId) {
        onNavigate(targetView);
      } else {
        onNavigate("landing");
      }
    }
  };

  return (
    <footer className="relative z-10 w-full mt-24 border-t border-white/[0.08] bg-void-950/90 backdrop-blur-2xl text-slate-300 font-body">
      {/* Decorative top ambient glow line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-coral/30 to-transparent pointer-events-none" />

      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-8 pt-16 pb-12">
        {/* 4-Column Responsive Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 mb-16">
          
          {/* Column 1 — Brand */}
          <div className="flex flex-col gap-4">
            <div
              onClick={() => onNavigate?.("landing")}
              className="flex items-center gap-3 cursor-pointer select-none group w-fit"
            >
              <div className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-coral to-magenta text-void-950 font-bold shadow-[0_0_20px_rgba(255,107,82,0.35)] group-hover:scale-105 transition-transform duration-200">
                <GitBranch className="h-5 w-5 text-void-950" />
              </div>
              <span className="text-2xl font-black bg-gradient-to-r from-coral via-magenta to-violet bg-clip-text text-transparent tracking-tight font-display">
                CommitIt
              </span>
            </div>

            <p className="text-xs text-slate-300/90 leading-relaxed font-normal max-w-xs pt-1">
              AI-powered repository intelligence for developers.
            </p>

            {/* Technology Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {["React", "FastAPI", "Python", "AI"].map((tech) => (
                <span
                  key={tech}
                  className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:border-coral/40 hover:text-coral transition-colors duration-200 select-none"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Column 2 — Product */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 font-mono mb-1">
              PRODUCT
            </h3>
            <ul className="flex flex-col gap-2.5 text-xs font-medium">
              <li>
                <button
                  onClick={() => handleProductClick("dashboard")}
                  className="text-slate-400 hover:text-slate-100 hover:translate-x-[3px] transition-all duration-200 ease-out text-left outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 rounded px-1 py-0.5"
                >
                  Dashboard
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleProductClick("universe")}
                  className="text-slate-400 hover:text-slate-100 hover:translate-x-[3px] transition-all duration-200 ease-out text-left outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 rounded px-1 py-0.5"
                >
                  Repository Universe
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleProductClick("universe")}
                  className="text-slate-400 hover:text-slate-100 hover:translate-x-[3px] transition-all duration-200 ease-out text-left outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 rounded px-1 py-0.5"
                >
                  Universe Search
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleProductClick("dashboard")}
                  className="text-slate-400 hover:text-slate-100 hover:translate-x-[3px] transition-all duration-200 ease-out text-left outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 rounded px-1 py-0.5"
                >
                  Impact Radar
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3 — Resources */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 font-mono mb-1">
              RESOURCES
            </h3>
            <ul className="flex flex-col gap-2.5 text-xs font-medium">
              <li>
                <a
                  href="https://github.com/pragya-shree/commitit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-100 hover:translate-x-[3px] transition-all duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 rounded px-1 py-0.5"
                >
                  <span>GitHub Repository</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/pragya-shree/commitit#readme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-100 hover:translate-x-[3px] transition-all duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 rounded px-1 py-0.5"
                >
                  <span>Documentation</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/pragya-shree/commitit/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-100 hover:translate-x-[3px] transition-all duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 rounded px-1 py-0.5"
                >
                  <span>Report an Issue</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4 — Connect */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 font-mono mb-1">
              CONNECT
            </h3>
            <p className="text-xs text-slate-300/90 leading-relaxed font-normal">
              Stay up to date with project developments and community updates.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://github.com/pragya-shree/commitit"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub Repository"
                className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-coral hover:border-coral/40 hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(255,107,82,0.35)] hover:-translate-y-1 transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
              >
                <GithubIcon className="h-4.5 w-4.5" />
              </a>
              <a
                href="https://www.linkedin.com/in/pragyashree1667/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn Profile"
                className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-coral hover:border-coral/40 hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(255,107,82,0.35)] hover:-translate-y-1 transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
              >
                <LinkedinIcon className="h-4.5 w-4.5" />
              </a>
              <a
                href="https://www.instagram.com/pragya__1667?igsh=MXZvcmVzdXBvc2R6bA=="
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-coral hover:border-coral/40 hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(255,107,82,0.35)] hover:-translate-y-1 transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
              >
                <InstagramIcon className="h-4.5 w-4.5" />
              </a>
              <a
                href="mailto:pragya.shree1667@gmail.com"
                aria-label="Send Email"
                className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-coral hover:border-coral/40 hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(255,107,82,0.35)] hover:-translate-y-1 transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
              >
                <Mail className="h-4.5 w-4.5" />
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Section Divider & Content */}
        <div className="relative pt-10 border-t border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-400">
          {/* Subtle glow above bottom divider */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-violet/30 to-transparent pointer-events-none" />

          <div className="order-1 md:order-1 text-center md:text-left select-none">
            © 2026 CommitIt
          </div>

          <div className="order-2 md:order-2 text-center text-slate-300">
            Built by{" "}
            <a
              href="https://www.linkedin.com/in/pragyashree1667/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gradient-warm hover:text-coral transition-colors duration-200 font-display focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint rounded"
            >
              Pragya Shree
            </a>
          </div>

          <div className="order-3 md:order-3 text-center md:text-right">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-white/[0.04] border border-white/[0.08] text-slate-400 select-none">
              Version 1.0.0
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
