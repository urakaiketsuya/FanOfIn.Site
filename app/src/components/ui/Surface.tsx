import type { ElementType, HTMLAttributes, ReactNode } from "react";

export default function Surface({ as: Tag = "section", children, className = "", ...props }: { as?: ElementType; children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return <Tag className={`rounded-xl border border-ctp-surface1 bg-ctp-mantle ${className}`} {...props}>{children}</Tag>;
}
