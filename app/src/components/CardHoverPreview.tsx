import { useEffect, useState, type FocusEvent, type MouseEvent, type ReactNode } from "react";
import { gatcgApi } from "../lib/api/client";

const PREVIEW_WIDTH = 220;
const PREVIEW_HEIGHT = PREVIEW_WIDTH * 1.4;
const CURSOR_OFFSET = 16;
const VIEWPORT_MARGIN = 8;

interface CardHoverPreviewProps {
  /** Edition image path (e.g. card.editions[0].image) — omit to render children with no hover behavior. */
  image: string | undefined;
  /** Alternate printed face from an edition's `other_orientations`. */
  backImage?: string;
  backAlt?: string;
  alt: string;
  children: ReactNode;
}

/** Wraps text (a decklist card name, etc.) with a floating card image that follows the cursor on hover. */
export default function CardHoverPreview({ image, backImage, backAlt, alt, children }: CardHoverPreviewProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => setShowBack(false), [image, backImage]);

  if (!image) return <>{children}</>;

  function clamp(x: number, y: number) {
    const previewHeight = PREVIEW_HEIGHT + (backImage ? 44 : 0);
    return {
      x: Math.max(VIEWPORT_MARGIN, Math.min(x, window.innerWidth - PREVIEW_WIDTH - VIEWPORT_MARGIN)),
      y: Math.max(VIEWPORT_MARGIN, Math.min(y, window.innerHeight - previewHeight - VIEWPORT_MARGIN)),
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
      data-component="CardHoverPreview"
      className="relative"
      onMouseEnter={handleMove}
      onMouseMove={handleMove}
      onMouseLeave={() => setPos(null)}
      onFocus={handleFocus}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPos(null);
      }}
    >
      {children}
      {pos && <span className="fixed z-50" style={{ left: pos.x, top: pos.y, width: PREVIEW_WIDTH }}>
        <img
          src={gatcgApi.imageUrl(showBack && backImage ? backImage : image)}
          alt={showBack ? backAlt ?? `${alt} reverse face` : alt}
          onError={() => setPos(null)}
          className="pointer-events-none w-full rounded-lg border border-ctp-surface1 shadow-xl"
        />
        {backImage && <span className="mt-1 grid grid-cols-2 gap-1 rounded-lg border border-ctp-surface1 bg-ctp-base/95 p-1 shadow-lg" role="group" aria-label={`${alt} card face`}>
          <button type="button" aria-pressed={!showBack} onClick={() => setShowBack(false)} className={`min-h-9 rounded-md px-2 text-xs font-medium ${!showBack ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:bg-ctp-surface0"}`}>Front</button>
          <button type="button" aria-pressed={showBack} onClick={() => setShowBack(true)} className={`min-h-9 rounded-md px-2 text-xs font-medium ${showBack ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:bg-ctp-surface0"}`}>Back</button>
        </span>}
      </span>}
    </span>
  );
}
