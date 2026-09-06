import { useState } from "react";
import { gatcgApi } from "../lib/api/client";

/** Official card-type badge icon (Champion, Action, Ally, Weapon, Item, Domain, Status, ...). Renders nothing if the CDN doesn't have an icon for this type, rather than a broken-image glyph. */
export default function TypeIcon({ type, size = 16, className }: { type: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <img
      data-component="TypeIcon"
      src={gatcgApi.iconUrl("types", type)}
      alt={type}
      title={type}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={className ?? "shrink-0"}
    />
  );
}
