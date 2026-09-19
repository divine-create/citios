'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Star, ArrowRight, MapPin, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMoney } from '@/components/cityos/CityProvider';

export function FallbackImg({
  src,
  alt,
  className,
  icon,
  gradient = 'from-teal-900 to-teal-700' }: {
  src?: string;
  alt: string;
  className?: string;
  icon?: React.ReactNode;
  gradient?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gradient-to-br text-white/70',
          gradient,
          className,
        )}
        role="img"
        aria-label={alt}
      >
        {icon ?? <span className="text-2xl font-black tracking-tight opacity-60">{alt.slice(0, 1)}</span>}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  );
}

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      <span className="text-xs font-bold text-slate-800">{rating.toFixed(1)}</span>
    </span>
  );
}

export function PriceTag({ amount, old, className }: { amount: number; old?: number; className?: string }) {
  const { fmt } = useMoney();
  return (
    <span className={cn('inline-flex items-baseline gap-2', className)}>
      <span className="font-black tracking-tight text-slate-900">{fmt(amount)}</span>
      {old ? <span className="text-xs text-slate-400 line-through">{fmt(old)}</span> : null}
    </span>
  );
}

export function Pill({
  children,
  tone = 'teal',
  className }: {
  children: React.ReactNode;
  tone?: 'teal' | 'orange' | 'blue' | 'slate' | 'green' | 'red';
  className?: string;
}) {
  const tones = {
    teal: 'bg-teal-50 text-teal-800 ring-teal-100',
    orange: 'bg-orange-50 text-orange-600 ring-orange-100',
    blue: 'bg-brand-50 text-brand-800 ring-brand-100',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    red: 'bg-red-50 text-red-600 ring-red-100' };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ring-1',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function OpenBadge({ open, className }: { open: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] font-bold',
        open ? 'text-emerald-700' : 'text-slate-500',
        className,
      )}
    >
      <span className={cn('w-2 h-2 rounded-full', open ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300')} />
      {open ? 'Open now' : 'Closed'}
    </span>
  );
}

export function SectionHead({
  title,
  sub,
  more,
  moreHref,
  onMore }: {
  title: string;
  sub?: string;
  more?: string;
  moreHref?: string;
  onMore?: () => void;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4 md:mb-5">
      <div>
        <h2 className="text-base md:text-lg font-black tracking-tight text-ink flex items-center gap-2">
          {title}
        </h2>
        {sub ? <p className="text-xs text-slate-500 mt-0.5 font-medium">{sub}</p> : null}
      </div>
      {more ? (
        moreHref ? (
          <Link
            href={moreHref}
            className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 hover:text-teal-900 transition-colors shrink-0"
          >
            {more}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <button
            onClick={onMore}
            className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 hover:text-teal-900 transition-colors shrink-0"
          >
            {more}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )
      ) : null}
    </div>
  );
}

export function CityCard({
  children,
  className,
  href,
  onClick }: {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(6,95,70,0.06)] hover:shadow-[0_10px_30px_-12px_rgba(6,95,70,0.25)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden',
        className,
      )}
    >
      {children}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block group">
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button onClick={onClick} className="block w-full text-left group">
        {inner}
      </button>
    );
  }
  return inner;
}

export function Avatar({
  name,
  img,
  className }: {
  name: string;
  img?: string;
  className?: string;
}) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  return (
    <div className={cn('relative shrink-0', className)}>
      <FallbackImg
        src={img}
        alt={name}
        className="absolute inset-0 w-full h-full rounded-full"
        icon={<span className="text-xs font-black">{initials}</span>}
      />
    </div>
  );
}

export function LocationRow({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-slate-500 font-medium', className)}>
      <MapPin className="w-3.5 h-3.5 text-teal-700" />
      {text}
    </span>
  );
}

export function VerifiedBadge({ label = 'Verified business' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-800 uppercase tracking-wider">
      <BadgeCheck className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

export function StatTile({
  label,
  value,
  delta,
  icon,
  tone = 'teal' }: {
  label: string;
  value: string;
  delta?: string;
  icon?: React.ReactNode;
  tone?: 'teal' | 'orange' | 'blue' | 'emerald';
}) {
  const icons = {
    teal: 'text-teal-700',
    orange: 'text-orange-600',
    blue: 'text-brand-700',
    emerald: 'text-emerald-700' };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-[0_1px_2px_rgba(6,95,70,0.06)]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
        {icon ? <span className={cn('w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center', icons[tone])}>{icon}</span> : null}
      </div>
      <div className="text-xl font-black tracking-tight text-ink mb-1">{value}</div>
      {delta ? <div className="text-[11px] font-bold text-emerald-600">{delta}</div> : null}
    </div>
  );
}

export function Money({ amount, className }: { amount: number; className?: string }) {
  const { fmt } = useMoney();
  return <span className={cn('font-black tracking-tight text-ink tabular-nums', className)}>{fmt(amount)}</span>;
}

export function ChipButton({
  children,
  active,
  className,
  onClick }: {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(className, 
        'px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ring-1',
        active
          ? 'bg-teal-800 text-white ring-teal-800 shadow-sm'
          : 'bg-white text-slate-600 ring-slate-200 hover:ring-teal-300 hover:text-teal-800',
      )}
    >
      {children}
    </button>
  );
}

export function GradientRing({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('p-[1.5px] rounded-full bg-gradient-to-br from-teal-600 via-teal-400 to-orange-300', className)}>
      <div className="p-[2px] rounded-full bg-white">{children}</div>
    </div>
  );
}