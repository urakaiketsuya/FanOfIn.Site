import { useState } from "react";
import { gatcgApi } from "../lib/api/client";

/** Official Memory/Reserve cost badge icon. Renders nothing if the CDN doesn't have an icon for this kind, rather than a broken-image glyph. */
export default function CostIcon({ kind, size = 16, className }: { kind: "memory" | "reserve"; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <img
      data-component="CostIcon"
      src={gatcgApi.iconUrl("costs", kind)}
      alt={`${kind} cost`}
      title={`${kind} cost`}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={className ?? "shrink-0"}
    />
  );
}
