import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_NAME = "Fan of Insight";
const SITE_URL = "https://fanofin.site";

function setMetaByAttr(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Sets `document.title`, the meta description, and the canonical link tag for the current route
 * — this is a fully client-rendered SPA with one static `index.html`, so these can't be baked in
 * server-side per page. Googlebot renders JS and picks up client-set title/meta/canonical tags
 * (a documented, widely-used pattern for SPAs without SSR); non-JS crawlers and social-media link
 * unfurlers won't see these regardless of how they're set, which is why index.html's static
 * defaults exist as the fallback for those.
 *
 * `title`/`description` are optional so a component can call this before its data has loaded
 * (e.g. `useDocumentTitle(card?.name)`) without flashing an empty title — a falsy value just
 * skips updating that field for this render, leaving whatever was there already.
 */
export function useDocumentTitle(title?: string | null, description?: string | null) {
  const location = useLocation();

  useEffect(() => {
    if (title) document.title = `${title} · ${SITE_NAME}`;
    if (description) {
      setMetaByAttr("name", "description", description);
      setMetaByAttr("property", "og:description", description);
    }
  }, [title, description]);

  useEffect(() => {
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", `${SITE_URL}${location.pathname}`);
  }, [location.pathname]);
}
