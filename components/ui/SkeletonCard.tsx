export function SkeletonCard({ lines = 2, className }: { lines?: number; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 p-4 space-y-3 animate-pulse ${className ?? ''}`}>
      <div className="h-36 rounded-xl bg-slate-100" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 rounded-full bg-slate-100 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}
