import { useEffect, useState } from "react";
import type { CollectionEntry } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";
import { subscribeCollectionChanges } from "../../lib/collectionEvents";

/** Saved physical inventory for calculators. Unknown/loading inventory is never an empty collection. */
export function useSavedCollection() {
  const [collection, setCollection] = useState<CollectionEntry[]>([]);
  const [collectionLoaded, setCollectionLoaded] = useState(false);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let revision = 0;
    const refresh = () => {
      const request = ++revision;
      setCollectionLoaded(false); setCollectionError(null);
      void accountApi.collection().then(result => {
        if (!active || request !== revision) return;
        setCollection(result.entries); setCollectionLoaded(true);
      }).catch(() => {
        if (!active || request !== revision) return;
        setCollection([]); setCollectionError("Collection unavailable. Sign in or open your collection to try again.");
      });
    };
    refresh();
    const unsubscribe = subscribeCollectionChanges(refresh);
    return () => { active = false; unsubscribe(); };
  }, []);
  return { collection, collectionLoaded, collectionError };
}
