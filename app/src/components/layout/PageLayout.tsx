import type { ElementType, HTMLAttributes, ReactNode } from "react";

export type PageWidth = "narrow" | "standard" | "wide" | "full";

const WIDTH_CLASSES: Record<PageWidth, string> = {
  narrow: "max-w-3xl",
  standard: "max-w-4xl",
  wide: "max-w-5xl",
  full: "max-w-6xl",
};

export default function PageLayout({
  as: Tag = "div",
  width = "narrow",
  children,
  className = "",
  ...props
}: {
  as?: ElementType;
  width?: PageWidth;
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>) {
  return <Tag className={`mx-auto px-4 py-8 ${WIDTH_CLASSES[width]} ${className}`} {...props}>{children}</Tag>;
}
