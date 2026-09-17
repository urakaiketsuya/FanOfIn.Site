export default function DeckResultsSkeleton() {
  return (
    <div className="mt-6 space-y-3" role="status" aria-label="Loading deck results">
      <span className="sr-only">Loading deck results…</span>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="animate-pulse rounded-lg border border-ctp-surface0 bg-ctp-mantle/60 p-4" aria-hidden="true">
          <div className="h-4 w-28 rounded bg-ctp-surface1" />
          <div className="mt-3 h-3 w-full max-w-md rounded bg-ctp-surface0" />
          <div className="mt-2 h-3 w-2/3 rounded bg-ctp-surface0" />
        </div>
      ))}
    </div>
  );
}

