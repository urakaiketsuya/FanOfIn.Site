import { createContext, useCallback, useContext, useEffect, useId } from "react";
import type { Toast, ToastInput } from "./toastState";
export const ToastContext = createContext<{
  queue: Toast[]; host: string; register: (id: string) => () => void;
  push: (input: ToastInput, owner: string) => string; dismiss: (id: string) => void; release: (owner: string) => void;
} | null>(null);
const noop = () => {};
export function useToast() {
  const context = useContext(ToastContext);
  const owner = useId();
  const push = context?.push;
  const release = context?.release;
  useEffect(() => () => release?.(owner), [owner, release]);
  const notify = useCallback((input: ToastInput) => push?.(input, owner) ?? "", [push, owner]);
  return { notify, dismiss: context?.dismiss ?? noop };
}
