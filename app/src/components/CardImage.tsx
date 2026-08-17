import { useState } from "react";
import { gatcgApi } from "../lib/api/client";

interface CardImageProps {
  image: string;
  alt: string;
  rounded?: boolean;
  className?: string;
}

/**
 * Same box before and after load (no wrapper/absolute positioning, so it can't cause layout
 * shift regardless of caller's sizing classes) — a neutral background shows through as a
 * placeholder while loading, faded in once the image actually paints. Callers relying on the
 * image's own aspect ratio for height (no explicit h-* class) won't show a placeholder shape
 * until loaded, same as before this change — give those an explicit `aspect-*` class if a
 * placeholder shape matters there.
 */
export default function CardImage({ image, alt, rounded, className }: CardImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  return (
    <img
      src={gatcgApi.imageUrl(image, rounded)}
      alt={alt}
      loading="lazy"
      onLoad={() => setStatus("loaded")}
      onError={() => setStatus("error")}
      className={`bg-ctp-surface0 transition-opacity duration-300 ${
        status === "loading" ? "animate-pulse opacity-0" : status === "error" ? "opacity-40" : "opacity-100"
      } ${className ?? "rounded-md"}`}
    />
  );
}
