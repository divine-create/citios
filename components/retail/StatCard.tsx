"use client";

import React from "react";


export function StatCard({ label, value, icon: Icon, tone = "brand", sub }: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  tone?: "brand" | "blue" | "emerald" | "amber" | "purple" | "red" | "slate";
  sub?: string;
}) {
  const TONES: Record<string, string> = {
    brand: "bg-brand-100 text-brand-800",
    blue: "bg-blue-100 text-blue-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    purple: "bg-purple-100 text-purple-700",
    red: "bg-red-100 text-red-700",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${TONES[tone]}`}>
            <Icon size={20} className="sm:hidden" />
            <Icon size={22} className="hidden sm:block" />
          </div>
        )}
        <p className="text-sm font-medium text-slate-500 truncate sm:hidden">{label}</p>
      </div>
      <div className="min-w-0">
        <p className="hidden sm:block text-sm font-medium text-slate-500 truncate">{label}</p>
        <p className="text-xl sm:text-2xl font-black text-ink tracking-tight mt-0.5 break-all sm:break-normal">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}
