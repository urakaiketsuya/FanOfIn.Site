import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md";

// hover -> active each step to a visibly deeper state, mirroring Material's hover/pressed state-layer
// opacity ramp (without a literal overlay layer, since these already use solid color/opacity swaps).
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-ctp-blue text-ctp-base hover:opacity-90 active:opacity-80",
  secondary: "border-ctp-surface1 text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text active:bg-ctp-surface0",
  danger: "border-ctp-red/60 text-ctp-red hover:bg-ctp-red/10 active:bg-ctp-red/20",
  ghost: "border-transparent text-ctp-subtext1 hover:bg-ctp-mantle hover:text-ctp-text active:bg-ctp-surface0",
};

export default function Button({ variant = "secondary", size = "md", children, className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; children: ReactNode }) {
  return <button data-component="Button" type={type} className={`rounded-md border font-medium disabled:cursor-not-allowed disabled:opacity-50 ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-2 text-sm"} ${VARIANTS[variant]} ${className}`} {...props}>{children}</button>;
}
