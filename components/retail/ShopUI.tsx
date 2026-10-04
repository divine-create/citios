"use client";

import React from "react";
import { X } from "lucide-react";

// =====================================================================
// ShopOS / DAASH design language — shared tokens + primitives
// (blue brand scale, navy ink text, soft tinted icon tiles, pill badges)
// =====================================================================

export const inputCls = "w-full px-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-sm text-ink shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none";
export const selectCls = `${inputCls} cursor-pointer`;

export const btnPrimary = "inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold tracking-tight px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-brand-900/10 ring-1 ring-inset ring-black/10 active:scale-[0.98]";
export const btnOutline = "inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm text-slate-700 text-sm font-semibold tracking-tight px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]";
export const btnDanger = "inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold tracking-tight px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 shadow-sm shadow-red-900/10 ring-1 ring-inset ring-black/10 active:scale-[0.98]";
export const btnDark =
  "inline-flex items-center justify-center gap-2 bg-ink hover:bg-slate-800 text-white text-sm font-bold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50";

export const cardCls = "bg-white border border-slate-200/60 rounded-2xl shadow-sm";
export const thCls = "px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50";
export const iconBtnCls = "p-1.5 text-slate-400 hover:text-brand-700 hover:bg-brand-50 rounded-md transition-colors";

const TONES: Record<string, string> = {
  brand: "bg-brand-100 text-brand-800",
  blue: "bg-blue-100 text-blue-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  purple: "bg-purple-100 text-purple-700",
  red: "bg-red-100 text-red-700",
  slate: "bg-slate-100 text-slate-600",
};

// ---------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------
export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`${cardCls} ${className}`}>{children}</div>;
}

// ---------------------------------------------------------------------
// StatCard — DAASH KPI: soft icon tile + label + bold value, no fake data
// ---------------------------------------------------------------------
export function StatCard({ label, value, icon: Icon, tone = "brand", sub }: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  tone?: keyof typeof TONES;
  sub?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
      {Icon && (
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ring-1 ring-inset ring-black/5 flex-shrink-0 ${TONES[tone]}`}>
          <Icon size={22} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500 truncate">{label}</p>
        <p className="text-2xl font-black text-ink tracking-tight mt-0.5 truncate">{value}</p>
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
        <h2 className="text-2xl font-black text-ink tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------
// PillTabs — DAASH segmented control (active = white pill in slate track)
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
            active === t.value ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-slate-800"
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
// Avatar — DAASH initials circle
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
export function ProgressBar({ percent, className = "", barClassName = "bg-brand-600" }: {
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
// Modal — DAASH modal shell
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
              {title && <h3 className="font-bold text-lg text-ink truncate">{title}</h3>}
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
// SectionCard — DAASH panel with optional header row
// ---------------------------------------------------------------------
export function SectionCard({ title, action, children, className = "", bodyClassName = "" }: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={`bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm ${className}`}>
      {(title || action) && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          {title && <h3 className="font-bold text-[15px] text-ink">{title}</h3>}
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
      <p className="font-bold text-ink">{title}</p>
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

// =====================================================================
// PHASE M1: MERCHANT DESIGN SYSTEM EXTENSIONS
// =====================================================================

import { Search as SearchIcon, AlertCircle } from "lucide-react";

export function OrderStatusBadge({ status, toneOverride }: { status: string; toneOverride?: keyof typeof TONES }) {
  const getTone = (): keyof typeof TONES => {
    if (toneOverride) return toneOverride;
    switch (status) {
      case 'PENDING': return 'amber';
      case 'CONFIRMED': return 'emerald';
      case 'PROCESSING': return 'blue';
      case 'READY': return 'violet';
      case 'FULFILLED': return 'slate';
      case 'CANCELLED': return 'rose';
      case 'RETURNED': return 'rose';
      default: return 'slate';
    }
  };
  return <StatusPill tone={getTone()}>{status}</StatusPill>;
}

export function PriceDisplay({ amount, currency = '₦', compareAt, className = "" }: { amount: number; currency?: string; compareAt?: number | null; className?: string }) {
  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className="font-bold text-ink">{currency}{amount.toLocaleString()}</span>
      {compareAt && compareAt > amount && (
        <span className="text-xs text-slate-400 line-through">{currency}{compareAt.toLocaleString()}</span>
      )}
    </div>
  );
}

export function StockIndicator({ stock, lowStockLevel }: { stock: number; lowStockLevel?: number | null }) {
  if (stock <= 0) return <span className="inline-flex items-center gap-1.5 text-rose-600 font-semibold text-sm"><span className="w-2 h-2 rounded-full bg-rose-500"></span>Out of stock</span>;
  if (lowStockLevel != null && stock <= lowStockLevel) return <span className="inline-flex items-center gap-1.5 text-amber-600 font-semibold text-sm"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Low stock ({stock})</span>;
  return <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold text-sm"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>In stock ({stock})</span>;
}

export function SearchInput({ value, onChange, placeholder = "Search..." }: { value: string; onChange: (val: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} pl-9`}
      />
    </div>
  );
}

export function FilterBar({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200 ${className}`}>
      {children}
    </div>
  );
}

export function ErrorState({ title, message, action }: { title: string; message?: string; action?: React.ReactNode }) {
  return (
    <div className="p-6 bg-rose-50 border border-rose-100 rounded-xl text-center">
      <AlertCircle className="w-10 h-10 mx-auto text-rose-500 mb-3" />
      <h4 className="font-bold text-rose-900">{title}</h4>
      {message && <p className="text-sm text-rose-600 mt-1">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "", style }: { className?: string, style?: React.CSSProperties }) {
  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} style={style} />;
}

export function ActionCard({ title, description, action, icon: Icon, tone = "slate" }: { title: string; description: string; action: React.ReactNode; icon?: React.ComponentType<{ size?: number; className?: string }>; tone?: keyof typeof TONES }) {
  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ring-1 ring-inset ring-black/5 flex-shrink-0 ${TONES[tone]}`}>
            <Icon size={22} />
          </div>
        )}
        <div>
          <h4 className="font-bold text-ink">{title}</h4>
          <p className="text-sm text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex-shrink-0">
        {action}
      </div>
    </div>
  );
}export function TableSkeleton({ rows = 3, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100 last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-4">
              <Skeleton className="h-4 w-full" style={{ opacity: 1 - j * 0.15 }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
