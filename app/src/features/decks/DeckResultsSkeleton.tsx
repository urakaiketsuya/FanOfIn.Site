export default function DeckResultsSkeleton() {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading deck results">
      <span className="sr-only">Loading deck results…</span>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-3xl border border-ctp-surface0 bg-ctp-mantle/60 motion-safe:animate-pulse" aria-hidden="true">
          <div className="flex justify-center bg-ctp-base/40 p-5">
            <div className="w-36 sm:w-40">
              <div className="aspect-[5/7] rounded bg-ctp-surface0" />
              <div className="mt-1 h-4 rounded bg-ctp-surface1" />
            </div>
          </div>
          <div className="space-y-3 p-4">
            <div className="h-3 w-28 rounded bg-ctp-surface1" />
            <div className="h-12 w-2/3 rounded bg-ctp-surface0" />
            <div className="h-5 w-full rounded bg-ctp-surface0" />
            <div className="h-12 rounded-lg bg-ctp-surface1" />
          </div>
        </div>
      ))}
    </div>
  );
}
