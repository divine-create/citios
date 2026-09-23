'use client';
import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className ?? ''}`}>
      {icon && <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">{icon}</div>}
      <h3 className="text-base font-black text-slate-700">{title}</h3>
      {description && <p className="text-sm text-slate-400 mt-1 max-w-xs">{description}</p>}
      {action && (
        action.href
          ? <a href={action.href} className="mt-4 px-5 py-2.5 bg-ink text-white text-xs font-black rounded-xl hover:bg-slate-800 transition-colors">{action.label}</a>
          : <button onClick={action.onClick} className="mt-4 px-5 py-2.5 bg-ink text-white text-xs font-black rounded-xl hover:bg-slate-800 transition-colors">{action.label}</button>
      )}
    </div>
  );
}
