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
 */
export default function LoadMore({ remaining, onLoadMore, label = "Load more" }: LoadMoreProps) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (remaining <= 0) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [remaining, onLoadMore]);

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
