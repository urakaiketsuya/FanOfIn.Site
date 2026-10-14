import { useCallback, useEffect, useRef, useState } from 'react';
import { collectionProgressKey, parseCollectionProgressGoals, type CollectionProgressGoal } from '@gatcg/shared';
import { accountApi } from '../../lib/accountApi';

type Command = { goals: CollectionProgressGoal[]; pinned: boolean; importing?: boolean };
export function useCollectionProgressGoals(userId: string) {
  const [pins, setPins] = useState<CollectionProgressGoal[]>([]);
  const [deviceGoals, setDeviceGoals] = useState<CollectionProgressGoal[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const command = useRef<Command | null>(null);
  const generation = useRef(0);
  const working = useRef(false);
  const key = `collection-progress-goals:${userId}`;
  const read = useCallback(async () => {
    if (working.current || command.current) return;
    const version = generation.current;
    working.current = true; setBusy(true);
    try {
      const result = await accountApi.collectionProgressGoals();
      if (version !== generation.current) return;
      if (result.userId !== userId) throw new Error('Account changed. Refresh to load your goals.');
      setPins(result.goals); setReady(true); setError('');
    } catch (error) {
      if (version === generation.current) setError(error instanceof Error ? error.message : 'Could not load account goals.');
    } finally {
      if (version === generation.current) { working.current = false; setBusy(false); }
    }
  }, [userId]);
  useEffect(() => {
    const version = ++generation.current; working.current = false; command.current = null;
    setPins([]); setReady(false); setDeviceGoals([]);
    try { setDeviceGoals(parseCollectionProgressGoals(localStorage.getItem(key))); }
    catch { /* Keep inaccessible device storage intact; account goals still work. */ }
    void read();
    const refresh = () => { void read(); };
    window.addEventListener('focus', refresh);
    return () => { generation.current = version + 1; window.removeEventListener('focus', refresh); };
  }, [key, read]);

  const save = async (next: Command) => {
    if (working.current) return;
    const version = generation.current;
    command.current = next; working.current = true; setBusy(true); setError('');
    try {
      const result = await accountApi.saveCollectionProgressGoals(userId, next.goals, next.pinned);
      if (version !== generation.current) return;
      if (result.userId !== userId) throw new Error('Account changed. Refresh to load your goals.');
      setPins(result.goals); setReady(true); command.current = null;
      if (next.importing) {
        const imported = new Set(next.goals.map(collectionProgressKey));
        const remaining = deviceGoals.filter(goal => !imported.has(collectionProgressKey(goal)));
        setDeviceGoals(remaining);
        try {
          // Preserve any device goals added while this request was in flight.
          const latest = parseCollectionProgressGoals(localStorage.getItem(key)).filter(goal => !imported.has(collectionProgressKey(goal)));
          if (latest.length) localStorage.setItem(key, JSON.stringify(latest)); else localStorage.removeItem(key);
          setDeviceGoals(latest);
        } catch { /* Account save succeeded; a later explicit import is idempotent. */ }
      }
    } catch (error) {
      if (version === generation.current) setError(`${error instanceof Error ? error.message : 'Could not save goals.'} Retry to finish saving.`);
    } finally {
      if (version === generation.current) { working.current = false; setBusy(false); }
    }
  };
  return {
    pins, deviceGoals, pinsReady: ready && !busy && !command.current, pinError: error, pinBusy: busy,
    retry: () => command.current ? void save(command.current) : void read(),
    togglePin: (goal: CollectionProgressGoal) => void save({ goals: [goal], pinned: !pins.some(pin => collectionProgressKey(pin) === collectionProgressKey(goal)) }),
    importGoals: () => void save({ goals: deviceGoals.slice(0, 100), pinned: true, importing: true }),
  };
}
