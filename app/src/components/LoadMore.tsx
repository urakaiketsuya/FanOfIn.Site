import Button from "./ui/Button";

interface LoadMoreProps {
  remaining: number;
  onLoadMore: () => void;
  label?: string;
}

/**
 * Click-to-load-more button. Deliberately click-only, not scroll-triggered – an IntersectionObserver
 * auto-load was tried and dropped: it could fire before the underlying data had actually settled
 * (e.g. right after a filter change swaps in a new dataset), which read as the page reloading
 * itself out of nowhere.
 */
export default function LoadMore({ remaining, onLoadMore, label = "Load more" }: LoadMoreProps) {
  if (remaining <= 0) return null;

  return (
    <Button
      data-component="LoadMore"
      type="button"
      onClick={onLoadMore}
      className="mt-4 w-full"
    >
      {label} ({remaining} remaining)
    </Button>
  );
}
