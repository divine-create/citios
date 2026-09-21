"use client";

import React from "react";
import { X } from "lucide-react";

// =====================================================================
// RestaurantOS design language — shared tokens + primitives
// (orange brand scale, amber accents, soft tinted icon tiles, pill badges)
// =====================================================================

export const inputCls =
  "w-full p-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 bg-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all appearance-none";
export const selectCls = `${inputCls} cursor-pointer`;

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-orange-600/25";
export const btnOutline =
  "inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50";
export const btnDanger =
  "inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50";
export const btnDark =
  "inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50";

export const cardCls = "bg-white border border-slate-200 rounded-xl";
export const thCls = "px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider";
export const iconBtnCls = "p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors";

const TONES: Record<string, string> = {
  brand: "bg-orange-100 text-orange-800",
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  red: "bg-red-100 text-red-700",
  rose: "bg-rose-100 text-rose-700",
  slate: "bg-slate-100 text-slate-600",
  purple: "bg-purple-100 text-purple-700",
};

// ---------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------
export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`${cardCls} ${className}`}>{children}</div>;
}

// ---------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------
export function StatCard({ label, value, icon: Icon, tone = "brand", sub }: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  tone?: keyof typeof TONES;
  sub?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
      {Icon && (
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${TONES[tone]}`}>
          <Icon size={22} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500 truncate">{label}</p>
        <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5 truncate">{value}</p>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// PageHeader
// ---------------------------------------------------------------------
export function PageHeader({ title, subtitle, actions }: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------
// PillTabs
// ---------------------------------------------------------------------
export function PillTabs<T extends string>({ tabs, active, onChange, className = "" }: {
  tabs: { value: T; label: React.ReactNode }[];
  active: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex gap-1 bg-slate-100 rounded-xl p-1 ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            active === t.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------
// StatusPill
// ---------------------------------------------------------------------
export function StatusPill({ tone = "slate", children }: {
  tone?: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------
export function Avatar({ name, className = "", tone = "brand" }: {
  name: string;
  className?: string;
  tone?: keyof typeof TONES;
}) {
  const initials = (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className={`w-8 h-8 rounded-full ${TONES[tone]} flex items-center justify-center text-xs font-bold flex-shrink-0 ${className}`}>
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------
// ProgressBar
// ---------------------------------------------------------------------
export function ProgressBar({ percent, className = "", barClassName = "bg-orange-600" }: {
  percent: number;
  className?: string;
  barClassName?: string;
}) {
  return (
    <div className={`h-2 bg-slate-100 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${barClassName}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------
export function Modal({ title, subtitle, onClose, children, footer, size = "md" }: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl w-full ${sizes[size]} overflow-hidden shadow-2xl`}>
        {(title || onClose) && (
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="min-w-0">
              {title && <h3 className="font-bold text-lg text-slate-900 truncate">{title}</h3>}
              {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            {onClose && (
              <button onClick={onClose} aria-label="Close" className="p-1.5 -mr-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={22} />
              </button>
            )}
          </div>
        )}
        {children}
        {footer && <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// SectionCard
// ---------------------------------------------------------------------
export function SectionCard({ title, action, children, className = "", bodyClassName = "" }: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          {title && <h3 className="font-bold text-[15px] text-slate-900">{title}</h3>}
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------
export function EmptyState({ icon: Icon, title, message, action, className = "" }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`p-8 text-center ${className}`}>
      <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 flex items-center justify-center mb-3">
        <Icon size={22} className="text-slate-400" />
      </div>
      <p className="font-bold text-slate-900">{title}</p>
      {message && <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------
// Kbd
// ---------------------------------------------------------------------
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-white text-slate-400 text-xs font-mono border border-slate-200">
      {children}
    </kbd>
  );
}
