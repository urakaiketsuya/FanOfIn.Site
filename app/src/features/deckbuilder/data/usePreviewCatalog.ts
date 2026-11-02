import { useEffect, useMemo, useState } from 'react';
import type { Card } from '@gatcg/shared';
import { isPreviewCard, mergePreviewCards, type PreviewCardRecord } from '../../../lib/previewCards';

export function usePreviewCatalog(official: Card[], selectedNames: string[]) {
  const [enabled, setEnabled] = useState(() => { try { return sessionStorage.getItem('builder-preview-cards') !== 'false'; } catch { return true; } });
  const [previews, setPreviews] = useState<PreviewCardRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Also load for restored drafts: turning browsing off must not invalidate selected cards.
  const needed = enabled || selectedNames.length > 0;
  useEffect(() => {
    if (!needed) return;
    const abort = new AbortController();
    setError(false); setLoading(true);
    fetch('/data/reference/card-spoilers-2026-11-01.json', { signal: abort.signal }).then(r => {
      if (!r.ok) throw new Error('Preview unavailable'); return r.json();
    }).then(data => { if (!Array.isArray(data.cards)) throw new Error('Invalid preview'); setPreviews(data.cards); })
      .catch(() => { if (!abort.signal.aborted) setError(true); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [needed, attempt]);
  const selectedKey = JSON.stringify(selectedNames);
  const catalog = useMemo(() => mergePreviewCards(official.filter(card => !isPreviewCard(card)), previews, enabled, JSON.parse(selectedKey)), [official, previews, enabled, selectedKey]);
  function toggle(value: boolean) { setEnabled(value); try { sessionStorage.setItem('builder-preview-cards', String(value)); } catch { /* Draft remains available. */ } }
  return { catalog, previews, previewEnabled: enabled, setPreviewEnabled: toggle, previewError: error, previewLoading: loading, retryPreviews: () => setAttempt(n => n + 1) };
}
