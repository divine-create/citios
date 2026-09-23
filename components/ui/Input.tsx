'use client';
import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export function Input({ label, error, leftIcon, className, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{leftIcon}</span>
        )}
        <input
          {...props}
          className={cn(
            'w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-ink placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors',
            error ? 'border-red-400 focus:ring-red-500/30 focus:border-red-500' : '',
            leftIcon ? 'pl-10' : '',
            className
          )}
        />
      </div>
      {error && <p className="text-xs font-bold text-red-500">{error}</p>}
    </div>
  );
}
