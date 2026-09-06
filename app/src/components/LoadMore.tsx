interface LoadMoreProps {
  remaining: number;
  onLoadMore: () => void;
  label?: string;
}

/**
 * Click-to-load-more button. Deliberately click-only, not scroll-triggered — an IntersectionObserver
 * auto-load was tried and dropped: it could fire before the underlying data had actually settled
 * (e.g. right after a filter change swaps in a new dataset), which read as the page reloading
 * itself out of nowhere.
 */
export default function LoadMore({ remaining, onLoadMore, label = "Load more" }: LoadMoreProps) {
  if (remaining <= 0) return null;

  return (
    <button
      data-component="LoadMore"
      type="button"
      onClick={onLoadMore}
      className="mt-4 w-full rounded-md border border-ctp-surface1 py-2 text-sm text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text"
    >
      {label} ({remaining} remaining)
    </button>
  );
}
