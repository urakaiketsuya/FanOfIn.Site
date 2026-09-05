import type { ReactNode } from "react";

/** A small toggle button for filter rows (Spirit/Element/type pickers) — active state gets the accent border, everything else is muted. */
export default function Chip({
  active,
  onClick,
  size = "md",
  children,
}: {
  active: boolean;
  onClick: () => void;
  size?: "sm" | "md";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border ${size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1"} text-xs ${
        active ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
      }`}
    >
      {children}
    </button>
  );
}
