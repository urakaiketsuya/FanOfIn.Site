import { useState } from "react";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/ui/toast/ToastContext";
import { deckShareUrl } from "../../lib/deckShareUrl";

/** Shared by the owner's Sharing tab and the signed-out published deck view. */
export default function CopyDeckLink({ publicSlug }: { publicSlug: string }) {
  const [copying, setCopying] = useState(false);
  const { notify } = useToast();
  async function copyLink() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(deckShareUrl(publicSlug));
      notify({ message: "Deck share link copied.", key: "share-link" });
    } catch {
      notify({ tone: "error", message: "Could not copy the deck link. Please try again.", key: "share-link" });
    } finally {
      setCopying(false);
    }
  }
  return <Button disabled={copying} onClick={() => void copyLink()}>{copying ? "Copying…" : "Copy link"}</Button>;
}
