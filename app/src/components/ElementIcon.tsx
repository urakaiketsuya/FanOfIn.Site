import { useState } from "react";
import { gatcgApi } from "../lib/api/client";

/** Official element badge icon (Fire, Water, Wind, Norm, Crux, Umbra, Exalted, Exia, Luxem, Astra, Tera). Renders nothing if the CDN doesn't have an icon for this element, rather than a broken-image glyph. */
export default function ElementIcon({ element, size = 16, className }: { element: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <img
      src={gatcgApi.iconUrl("elements", element)}
      alt={element}
      title={element}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={className ?? "shrink-0"}
    />
  );
}
