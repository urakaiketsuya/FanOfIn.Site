import { useEffect, useState } from "react";
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
  useEffect(() => setStatus("loading"), [image]);

  if (status === "error") {
    return <div
      data-component="CardImage"
      role="img"
      aria-label={`${alt} image unavailable`}
      className={`flex items-center justify-center bg-ctp-surface0 p-1 text-center text-[10px] leading-tight text-ctp-subtext0 ${className ?? "rounded-md"}`}
    >
      <span className="line-clamp-3">{alt}<span className="sr-only"> — image unavailable</span></span>
    </div>;
  }

  return (
    <img
      data-component="CardImage"
      src={gatcgApi.imageUrl(image, rounded)}
      alt={alt}
      loading="lazy"
      onLoad={() => setStatus("loaded")}
      onError={() => setStatus("error")}
      className={`bg-ctp-surface0 transition-opacity duration-300 ${status === "loading" ? "animate-pulse opacity-0" : "opacity-100"} ${className ?? "rounded-md"}`}
    />
  );
}
