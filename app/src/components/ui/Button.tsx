import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-ctp-blue text-ctp-base hover:opacity-90",
  secondary: "border-ctp-surface1 text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text",
  danger: "border-ctp-red/60 text-ctp-red hover:bg-ctp-red/10",
  ghost: "border-transparent text-ctp-subtext1 hover:bg-ctp-mantle hover:text-ctp-text",
};

export default function Button({ variant = "secondary", size = "md", children, className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; children: ReactNode }) {
  return <button type={type} className={`rounded-md border font-medium disabled:cursor-not-allowed disabled:opacity-50 ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-2 text-sm"} ${VARIANTS[variant]} ${className}`} {...props}>{children}</button>;
}
