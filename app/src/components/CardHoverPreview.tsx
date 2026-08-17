import { useState, type MouseEvent, type ReactNode } from "react";
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

  function handleMove(e: MouseEvent) {
    const x = Math.min(e.clientX + CURSOR_OFFSET, window.innerWidth - PREVIEW_WIDTH - VIEWPORT_MARGIN);
    const y = Math.min(e.clientY + CURSOR_OFFSET, window.innerHeight - PREVIEW_HEIGHT - VIEWPORT_MARGIN);
    setPos({ x: Math.max(x, VIEWPORT_MARGIN), y: Math.max(y, VIEWPORT_MARGIN) });
  }

  return (
    <span className="relative" onMouseEnter={handleMove} onMouseMove={handleMove} onMouseLeave={() => setPos(null)}>
      {children}
      {pos && (
        <img
          src={gatcgApi.imageUrl(image)}
          alt={alt}
          className="pointer-events-none fixed z-50 rounded-lg border border-ctp-surface1 shadow-xl"
          style={{ left: pos.x, top: pos.y, width: PREVIEW_WIDTH }}
        />
      )}
    </span>
  );
}
