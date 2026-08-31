import type { DeckFormat, DeckVisibility } from "@gatcg/shared";
import type { ReactNode } from "react";

interface Props {
  title: string;
  championName: string | null;
  format: DeckFormat;
  eyebrow?: ReactNode;
  description?: string;
  versionNumber?: number;
  visibility?: DeckVisibility;
}

export default function UserDeckHeader({ title, championName, format, eyebrow, description, versionNumber, visibility }: Props) {
  return <header>
    {eyebrow && <div className="text-sm text-ctp-subtext1">{eyebrow}</div>}
    <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-bold text-ctp-text">{title}</h1><p className="mt-1 text-sm text-ctp-subtext1">{championName ?? "Unknown champion"} · {format}{versionNumber ? ` · Version ${versionNumber}` : ""}</p></div>
      {visibility && <span className="rounded-full border border-ctp-surface1 px-3 py-1 text-xs capitalize text-ctp-subtext1">{visibility}</span>}
    </div>
    {description && <p className="mt-5 whitespace-pre-wrap text-ctp-subtext1">{description}</p>}
  </header>;
}
