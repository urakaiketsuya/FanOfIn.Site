import type { ElementType, HTMLAttributes, ReactNode } from "react";

/** Same elevation ladder as `Panel`'s "default" tone — see that file's comment for why tonal
 * lightening (not just shadow) is used on this dark theme. */
type SurfaceElevation = 0 | 1 | 2;

const ELEVATION_CLASSES: Record<SurfaceElevation, string> = {
  0: "border-ctp-surface1 bg-ctp-mantle",
  1: "border-transparent bg-ctp-surface0 shadow-md shadow-black/30",
  2: "border-transparent bg-ctp-surface1 shadow-lg shadow-black/40",
};

export default function Surface({ as: Tag = "section", elevation = 0, children, className = "", ...props }: { as?: ElementType; elevation?: SurfaceElevation; children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return <Tag className={`rounded-xl border ${ELEVATION_CLASSES[elevation]} ${className}`} {...props}>{children}</Tag>;
}
