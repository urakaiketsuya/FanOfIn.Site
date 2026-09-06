import type { ElementType, HTMLAttributes, ReactNode } from "react";

type PanelTone = "default" | "info" | "success" | "warning" | "danger";
type PanelPadding = "none" | "sm" | "md" | "lg";
/** 0 = flat (unchanged default). 1-2 raise the panel: for the neutral "default" tone this steps one
 * rung up Catppuccin's own surface ladder (mantle -> surface0 -> surface1) rather than introducing a
 * separate gray, since Material's dark-theme guidance calls for tonal lightening over pure shadow —
 * shadows barely read against a dark base on their own. Colored tones keep their own tint at every
 * level (shadow only) since they already read as distinct from the page via color. */
type PanelElevation = 0 | 1 | 2;

const TONE_CLASSES: Record<PanelTone, string> = {
  default: "border-ctp-surface1 bg-ctp-mantle",
  info: "border-ctp-blue/40 bg-ctp-blue/10",
  success: "border-ctp-green/40 bg-ctp-green/10",
  warning: "border-ctp-yellow/40 bg-ctp-yellow/10",
  danger: "border-ctp-red/40 bg-ctp-red/10",
};

const DEFAULT_TONE_BY_ELEVATION: Record<PanelElevation, string> = {
  0: TONE_CLASSES.default,
  1: "border-transparent bg-ctp-surface0",
  2: "border-transparent bg-ctp-surface1",
};

const ELEVATION_SHADOW: Record<PanelElevation, string> = {
  0: "",
  1: "shadow-md shadow-black/30",
  2: "shadow-lg shadow-black/40",
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
  elevation = 0,
  children,
  className = "",
  ...props
}: {
  as?: ElementType;
  tone?: PanelTone;
  padding?: PanelPadding;
  elevation?: PanelElevation;
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>) {
  const toneClass = tone === "default" ? DEFAULT_TONE_BY_ELEVATION[elevation] : TONE_CLASSES[tone];
  return <Tag data-component="Panel" className={`rounded-xl border ${toneClass} ${ELEVATION_SHADOW[elevation]} ${PADDING_CLASSES[padding]} ${className}`} {...props}>{children}</Tag>;
}
