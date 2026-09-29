import { useEffect, useState } from "react";
import { useToast } from "./ToastContext";
/** Browser connectivity is a hint, not confirmation that account changes have synced. */
export default function ConnectivityNotice() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const { notify } = useToast();
  useEffect(() => {
    let wasOffline = !navigator.onLine;
    const lost = () => { wasOffline = true; setOffline(true); };
    const restored = () => {
      setOffline(false);
      if (wasOffline) notify({ tone: "info", message: "Device back online. You can retry any unsaved account changes.", key: "connectivity" });
      wasOffline = false;
    };
    window.addEventListener("offline", lost); window.addEventListener("online", restored);
    return () => { window.removeEventListener("offline", lost); window.removeEventListener("online", restored); };
  }, [notify]);
  return offline ? <p role="status" className="mx-auto max-w-5xl px-4 py-2 text-sm text-ctp-yellow">Offline. Some actions need an internet connection.</p> : null;
}
