import { useState, type FocusEvent, type MouseEvent, type ReactNode } from "react";
import { gatcgApi } from "../lib/api/client";

const PREVIEW_WIDTH = 220;
const PREVIEW_HEIGHT = PREVIEW_WIDTH * 1.4;
const CURSOR_OFFSET = 16;
const VIEWPORT_MARGIN = 8;

interface CardHoverPreviewProps {
  /** Edition image path (e.g. card.editions[0].image) — omit to render children with no hover behavior. */
  image: string | undefined;
  alt: string;
  children: ReactNode;
}

/** Wraps text (a decklist card name, etc.) with a floating card image that follows the cursor on hover. */
export default function CardHoverPreview({ image, alt, children }: CardHoverPreviewProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  if (!image) return <>{children}</>;

  function clamp(x: number, y: number) {
    return {
      x: Math.max(VIEWPORT_MARGIN, Math.min(x, window.innerWidth - PREVIEW_WIDTH - VIEWPORT_MARGIN)),
      y: Math.max(VIEWPORT_MARGIN, Math.min(y, window.innerHeight - PREVIEW_HEIGHT - VIEWPORT_MARGIN)),
    };
  }

  function handleMove(e: MouseEvent) {
    setPos(clamp(e.clientX + CURSOR_OFFSET, e.clientY + CURSOR_OFFSET));
  }

  // Keyboard/touch users have no cursor to follow — anchor the preview to the focused element's
  // right edge instead, so tabbing through a card name still shows the card.
  function handleFocus(e: FocusEvent) {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos(clamp(rect.right + CURSOR_OFFSET, rect.top));
  }

  return (
    <span
      className="relative"
      onMouseEnter={handleMove}
      onMouseMove={handleMove}
      onMouseLeave={() => setPos(null)}
      onFocus={handleFocus}
      onBlur={() => setPos(null)}
    >
      {children}
      {pos && (
        <img
          src={gatcgApi.imageUrl(image)}
          alt={alt}
          onError={() => setPos(null)}
          className="pointer-events-none fixed z-50 rounded-lg border border-ctp-surface1 shadow-xl"
          style={{ left: pos.x, top: pos.y, width: PREVIEW_WIDTH }}
        />
      )}
    </span>
  );
}
