import type { ElementType, HTMLAttributes, ReactNode } from "react";

type PanelTone = "default" | "info" | "success" | "warning" | "danger";
type PanelPadding = "none" | "sm" | "md" | "lg";

const TONE_CLASSES: Record<PanelTone, string> = {
  default: "border-ctp-surface1 bg-ctp-mantle",
  info: "border-ctp-blue/40 bg-ctp-blue/10",
  success: "border-ctp-green/40 bg-ctp-green/10",
  warning: "border-ctp-yellow/40 bg-ctp-yellow/10",
  danger: "border-ctp-red/40 bg-ctp-red/10",
};

const PADDING_CLASSES: Record<PanelPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export default function Panel({
  as: Tag = "section",
  tone = "default",
  padding = "md",
  children,
  className = "",
  ...props
}: {
  as?: ElementType;
  tone?: PanelTone;
  padding?: PanelPadding;
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>) {
  return <Tag className={`rounded-xl border ${TONE_CLASSES[tone]} ${PADDING_CLASSES[padding]} ${className}`} {...props}>{children}</Tag>;
}
