import { useState } from "react";
import { gatcgApi } from "../lib/api/client";

/** Official class badge icon (Warrior, Mage, Cleric, Assassin, Ranger, Tamer). Renders nothing if the CDN doesn't have an icon for this class, rather than a broken-image glyph. */
export default function ClassIcon({ cardClass, size = 16, className }: { cardClass: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <img
      data-component="ClassIcon"
      src={gatcgApi.iconUrl("classes", cardClass)}
      alt={cardClass}
      title={cardClass}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={className ?? "shrink-0"}
    />
  );
}
