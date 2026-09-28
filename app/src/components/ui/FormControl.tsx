import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

const CONTROL_CLASS = "min-h-12 min-w-0 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue disabled:cursor-not-allowed disabled:opacity-50";

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${CONTROL_CLASS} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${CONTROL_CLASS} ${className}`} {...props} />;
}

