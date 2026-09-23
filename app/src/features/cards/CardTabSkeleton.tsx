export default function CardTabSkeleton({ label = "Loading card data" }: { label?: string }) {
  return <div className="mt-4 animate-pulse motion-reduce:animate-none" role="status" aria-label={label}>
    <span className="sr-only">{label}…</span>
    <div className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4">
      <div className="h-5 w-40 rounded bg-ctp-surface1" />
      <div className="mt-2 h-3 w-2/3 max-w-md rounded bg-ctp-surface0" />
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((index) => <div key={index} className="flex items-center gap-3 rounded-lg border border-ctp-surface1/70 p-2">
          <div className="aspect-[5/7] w-12 shrink-0 rounded bg-ctp-surface1" />
          <div className="min-w-0 flex-1 space-y-2"><div className="h-4 w-3/4 rounded bg-ctp-surface1" /><div className="h-3 w-1/2 rounded bg-ctp-surface0" /></div>
        </div>)}
      </div>
    </div>
  </div>;
}
