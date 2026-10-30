import type { ElementType, HTMLAttributes, ReactNode } from "react";

export type PageWidth = "narrow" | "standard" | "wide" | "full" | "fluid";

const WIDTH_CLASSES: Record<PageWidth, string> = {
  narrow: "max-w-3xl",
  standard: "max-w-4xl",
  wide: "max-w-5xl",
  full: "max-w-6xl",
  fluid: "max-w-none",
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
  return <Tag data-component="PageLayout" className={`mx-auto w-full min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 ${WIDTH_CLASSES[width]} ${className}`} {...props}>{children}</Tag>;
}
