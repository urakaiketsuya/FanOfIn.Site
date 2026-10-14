import { canonicalSiteUrl } from "@gatcg/shared";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_NAME = "Fan of Insight";

function setMetaByAttr(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** Keep client navigation aligned with metadata in generated entry pages. */
export function useDocumentTitle(title?: string | null, description?: string | null, canonicalPath?: string, social?: { src: string; alt: string }) {
  const location = useLocation();
  const socialSrc = social?.src;
  const socialAlt = social?.alt;

  useEffect(() => {
    if (title) {
      document.title = `${title} · ${SITE_NAME}`;
      setMetaByAttr("property", "og:title", document.title);
      setMetaByAttr("name", "twitter:title", document.title);
    }
    if (description) {
      setMetaByAttr("name", "description", description);
      setMetaByAttr("property", "og:description", description);
      setMetaByAttr("name", "twitter:description", description);
    }
  }, [title, description]);

  useEffect(() => {
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    const canonical = canonicalSiteUrl(canonicalPath ?? location.pathname);
    link.setAttribute("href", canonical);
    setMetaByAttr("property", "og:url", canonical);
    // Initial structured data must not describe a different route after SPA navigation.
    const structured = document.querySelector("script[data-canonical]");
    const staleStructured = structured && structured.getAttribute("data-canonical") !== canonical;
    if (staleStructured) structured.remove();
    if (socialSrc || !structured || staleStructured) {
      const image = socialSrc ?? "https://fanofin.site/media/social/fan-of-insight-v1.jpg";
      setMetaByAttr("property", "og:image", image);
      setMetaByAttr("name", "twitter:image", image);
      setMetaByAttr("property", "og:image:alt", socialAlt ?? SITE_NAME);
      setMetaByAttr("name", "twitter:image:alt", socialAlt ?? SITE_NAME);
      setMetaByAttr("property", "og:image:width", "1200");
      setMetaByAttr("property", "og:image:height", "630");
      setMetaByAttr("property", "og:image:type", "image/jpeg");
      setMetaByAttr("name", "twitter:card", "summary_large_image");
    }
  }, [location.pathname, canonicalPath, socialSrc, socialAlt]);
}
