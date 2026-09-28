import {useCallback, useEffect, useRef, useState} from "react";
import {acknowledgeCollectionBatch, emptyCollectionQueue, parseCollectionQueue, prepareCollectionBatch, type CollectionDrafts, type CollectionSaveQueue} from "./collectionSaveQueue";

/** Persist the draft and in-flight request together before sending any network write. */
export function useCollectionSaveQueue(userId: string | undefined) {
  const current = useRef({owner: userId, queue:emptyCollectionQueue()});
  const [queue,setQueue] = useState(emptyCollectionQueue);
  const [warning,setWarning] = useState("");
  const persist = useCallback((next: CollectionSaveQueue) => {
    if (!userId || current.current.owner !== userId) return;
    current.current.queue=next; setQueue(next);
    try {localStorage.setItem(`collection-save:${userId}`,JSON.stringify(next)); sessionStorage.removeItem(`collection-quantities:${userId}`); sessionStorage.removeItem(`collection-save:${userId}`); setWarning("");}
    catch {
      try {sessionStorage.setItem(`collection-save:${userId}`,JSON.stringify(next));setWarning("Changes are backed up for this tab only. Keep it open until saving completes.");}
      catch {setWarning("Browser storage is unavailable. Keep this tab open until your changes are saved.");}
    }
  },[userId]);
  useEffect(()=>{
    const next=emptyCollectionQueue();
    try {
      if(userId) {
        let stored: string | null = null;
        try {stored=localStorage.getItem(`collection-save:${userId}`);} catch { /* Fall back to this tab's backup. */ }
        try {stored=sessionStorage.getItem(`collection-save:${userId}`) ?? stored;} catch { /* Local backup remains usable when session storage is blocked. */ }
        const recovered=stored ? JSON.parse(stored) : {drafts:JSON.parse(sessionStorage.getItem(`collection-quantities:${userId}`) ?? "{}"),pending:null};
        Object.assign(next,parseCollectionQueue(recovered));
      }
      setWarning("");
    } catch {setWarning("Saved draft data could not be read. Keep this tab open while editing.");}
    current.current={owner:userId,queue:next}; setQueue(next);
    if(userId && Object.keys(next.drafts).length) persist(next);
  },[userId,persist]);
  const setDrafts=useCallback((value: CollectionDrafts | ((drafts:CollectionDrafts)=>CollectionDrafts))=>{
    if(current.current.queue.pending) return;
    persist({...current.current.queue,drafts:typeof value==='function'?value(current.current.queue.drafts):value});
  },[persist]);
  const prepare=()=>{
    const next=prepareCollectionBatch(current.current.queue,crypto.randomUUID()); persist(next); return next.pending;
  };
  const acknowledge=(requestId:string)=>persist(acknowledgeCollectionBatch(current.current.queue,requestId));
  const rejected=()=>persist({...current.current.queue,pending:null});
  return {drafts:queue.drafts,pending:queue.pending,setDrafts,prepare,acknowledge,rejected,warning};
}
