import { useCallback } from "react";
import { useToast } from "./ToastContext";
/** For completed actions only; validation and unresolved status stay inline. */
export function useActionNotice() {
  const { notify } = useToast();
  return useCallback((message: string | null) => { if (message) notify({ message, key: "action" }); }, [notify]);
}
