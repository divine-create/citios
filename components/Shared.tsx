import React from 'react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Button({ className, variant = 'primary', size = 'default', ...props }: any) {
   const variants = {
      primary: "bg-teal-800 text-white hover:bg-teal-700 shadow-sm",
      accent: "bg-orange-500 text-white hover:bg-orange-600 shadow-sm shadow-orange-200",
      outline: "border border-slate-200 text-slate-800 hover:bg-slate-50",
      ghost: "hover:bg-slate-100 text-slate-700"
   };
   const sizes = {
      default: "px-6 py-2.5 rounded-xl font-bold text-xs",
      sm: "px-4 py-2 rounded-lg font-bold text-xs",
      icon: "p-2.5 rounded-xl"
   }
   return <button className={cn("transition-colors inline-flex items-center justify-center gap-2", variants[variant as keyof typeof variants], sizes[size as keyof typeof sizes], className)} {...props} />
}

export function Card({ className, hoverable = false, ...props }: any) {
   return <div className={cn("bg-white rounded-2xl shadow-sm border border-slate-100 p-6", hoverable && "hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer", className)} {...props} />
}

export function Badge({ children, variant = 'default', className }: any) {
    const variants = {
        default: "bg-teal-100 text-teal-800",
        alert: "bg-orange-50 text-orange-600",
        neutral: "bg-slate-100 text-slate-700"
    }
    return <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", variants[variant as keyof typeof variants], className)}>{children}</span>
}
