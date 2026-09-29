import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ToastContext } from "./ToastContext";
import { enqueueToast, makeToast, type Toast, type ToastInput } from "./toastState";
export default function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Toast[]>([]);
  const [hosts, setHosts] = useState<string[]>([]);
  const push = useCallback((input: ToastInput, owner: string) => {
    const id = crypto.randomUUID();
    setQueue(items => enqueueToast(items, makeToast(input, id, owner)));
    return id;
  }, []);
  const dismiss = useCallback((id: string) => setQueue(items => items.filter(item => item.id !== id)), []);
  // Callbacks into unmounted editors must never remain actionable after navigation.
  const release = useCallback((owner: string) => setQueue(items => items.filter(item => item.owner !== owner || !item.action || "to" in item.action)), []);
  const register = useCallback((id: string) => {
    setHosts(items => [...items.filter(item => item !== id), id]);
    return () => setHosts(items => items.filter(item => item !== id));
  }, []);
  const value = useMemo(() => ({ queue, host: hosts.at(-1) ?? "app", push, dismiss, release, register }), [queue, hosts, push, dismiss, release, register]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
