// Google Analytics (GA4), loaded only in production builds when VITE_GA_MEASUREMENT_ID is set —
// local dev never reports pageviews. Also skipped when the browser sends Do Not Track, in keeping
// with this site's no-user-data-by-default posture (see CLAUDE.md) even though GA4 itself doesn't
// read that signal on its own.
//
// send_page_view is disabled and pageviews are sent manually on route change instead of relying on
// GA4's history-change auto-tracking, since React Router's client-side navigation doesn't reliably
// trigger it the same way a full page load does.

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

function analyticsEnabled(): boolean {
  return Boolean(MEASUREMENT_ID) && import.meta.env.PROD && navigator.doNotTrack !== "1";
}

let initialized = false;

export function initAnalytics(): void {
  if (initialized || !analyticsEnabled()) return;
  initialized = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, { send_page_view: false });
}

export function trackPageview(path: string): void {
  if (!analyticsEnabled() || !window.gtag) return;
  window.gtag("event", "page_view", { page_path: path, page_location: window.location.href });
}
