import { useEffect, useRef } from "react";

interface LoadMoreProps {
  remaining: number;
  onLoadMore: () => void;
  label?: string;
}

/**
 * Click-to-load-more button that also auto-triggers via IntersectionObserver once it scrolls
 * near the viewport — supports both interaction styles without picking one over the other.
 * `rootMargin` fires the load ~400px before the button is actually on screen, so continuous
 * scrolling doesn't visibly pause on a still-loading button.
 *
 * The observer is set up once per mount (empty effect deps), not re-created on every render.
 * `onLoadMore` is almost always a fresh inline closure from the caller, and IntersectionObserver
 * fires an immediate notification when `observe()` is called on an already-intersecting element
 * — depending on `onLoadMore` (or `remaining`, which changes every load) here would tear down and
 * rebuild the observer after every single load, re-triggering instantly while the button is still
 * in view and spinning the page in a tight load loop. A ref sidesteps that without losing the
 * latest closure.
 */
export default function LoadMore({ remaining, onLoadMore, label = "Load more" }: LoadMoreProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMoreRef.current();
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (remaining <= 0) return null;

  return (
    <button
      ref={ref}
      type="button"
      onClick={onLoadMore}
      className="mt-4 w-full rounded-md border border-ctp-surface1 py-2 text-sm text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text"
    >
      {label} ({remaining} remaining)
    </button>
  );
}
