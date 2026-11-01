/** Watch only while mounted; returning to a visible tab catches background uploads. */
export function watchPublishedUpdates(check: () => void, host: Pick<Window, 'setInterval' | 'clearInterval' | 'addEventListener' | 'removeEventListener'> = window, page: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'> = document) {
  const visibleCheck = () => { if (page.visibilityState !== 'hidden') check(); };
  const timer = host.setInterval(visibleCheck, 60_000);
  host.addEventListener('focus', visibleCheck);
  host.addEventListener('online', visibleCheck);
  page.addEventListener('visibilitychange', visibleCheck);
  return () => {
    host.clearInterval(timer);
    host.removeEventListener('focus', visibleCheck);
    host.removeEventListener('online', visibleCheck);
    page.removeEventListener('visibilitychange', visibleCheck);
  };
}
