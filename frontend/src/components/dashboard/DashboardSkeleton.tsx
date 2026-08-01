import React from "react";

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8 animate-pulse">
      {/* Welcome Banner Skeleton */}
      <div className="rounded-3xl border border-white/[0.08] bg-void-900/60 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-white/[0.08]" />
          <div className="space-y-2">
            <div className="h-7 w-64 rounded-lg bg-white/[0.08]" />
            <div className="h-4 w-48 rounded-lg bg-white/[0.05]" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-32 rounded-xl bg-white/[0.08]" />
          <div className="h-10 w-36 rounded-xl bg-coral/20 border border-coral/30" />
        </div>
      </div>

      {/* Quick Action Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-white/[0.06] bg-void-950/60 p-4 flex flex-col justify-between">
            <div className="h-9 w-9 rounded-xl bg-white/[0.08]" />
            <div className="h-4 w-24 rounded bg-white/[0.08]" />
          </div>
        ))}
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.06] bg-void-950/40 p-4 space-y-2">
            <div className="h-3 w-16 rounded bg-white/[0.06]" />
            <div className="h-6 w-12 rounded bg-white/[0.1]" />
          </div>
        ))}
      </div>

      {/* Repositories & Activity Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-6 w-44 rounded bg-white/[0.08]" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-44 rounded-2xl border border-white/[0.06] bg-void-950/60 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-32 rounded bg-white/[0.08]" />
                  <div className="h-4 w-12 rounded bg-white/[0.06]" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-48 rounded bg-white/[0.05]" />
                  <div className="h-3 w-28 rounded bg-white/[0.05]" />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="h-6 w-20 rounded-full bg-white/[0.06]" />
                  <div className="h-8 w-16 rounded-lg bg-white/[0.08]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="h-6 w-36 rounded bg-white/[0.08]" />
          <div className="rounded-2xl border border-white/[0.06] bg-void-950/60 p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <div className="space-y-1.5">
                  <div className="h-3.5 w-40 rounded bg-white/[0.08]" />
                  <div className="h-2.5 w-24 rounded bg-white/[0.05]" />
                </div>
                <div className="h-6 w-6 rounded-full bg-white/[0.06]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
