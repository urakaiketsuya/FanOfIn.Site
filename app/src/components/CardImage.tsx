import { useEffect, useRef, useState } from "react";
import { gatcgApi } from "../lib/api/client";

interface CardImageProps {
  image: string;
  alt: string;
  rounded?: boolean;
  className?: string;
}

/**
 * Same box before and after load (no wrapper/absolute positioning, so it can't cause layout
 * shift regardless of caller's sizing classes) – a neutral background shows through as a
 * placeholder while loading, faded in once the image actually paints. Callers relying on the
 * image's own aspect ratio for height (no explicit h-* class) won't show a placeholder shape
 * until loaded, same as before this change – give those an explicit `aspect-*` class if a
 * placeholder shape matters there.
 */
export default function CardImage({ image, alt, rounded, className }: CardImageProps) {
  const src = gatcgApi.imageUrl(image, rounded);
  return <CardImageSource key={src} src={src} alt={alt} className={className} />;
}

function CardImageSource({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  // Cached images can finish before React observes their load event. Never reset
  // a completed image to loading after its onLoad handler has already run.
  useEffect(() => {
    const img = imageRef.current;
    if (img?.complete) setStatus(img.naturalWidth > 0 ? "loaded" : "error");
  }, []);

  if (status === "error") {
    return <div
      data-component="CardImage"
      role="img"
      aria-label={`${alt} image unavailable`}
      className={`flex items-center justify-center bg-ctp-surface0 p-1 text-center text-[10px] leading-tight text-ctp-subtext0 ${className ?? "rounded-md"}`}
    >
      <span className="line-clamp-3">{alt}<span className="sr-only"> – image unavailable</span></span>
    </div>;
  }

  return (
    <img
      data-component="CardImage"
      ref={imageRef}
      src={src}
      alt={alt}
      loading="lazy"
      onLoad={() => setStatus("loaded")}
      onError={() => setStatus("error")}
      className={`bg-ctp-surface0 transition-opacity duration-200 ${status === "loading" ? "opacity-0" : "opacity-100"} ${className ?? "rounded-md"}`}
    />
  );
}
