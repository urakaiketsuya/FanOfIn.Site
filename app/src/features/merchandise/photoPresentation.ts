import galleryPhotos from "./galleryPhotos.json";

/** Direct URLs copied from each source page’s Full image embed code. */
export function galleryImageUrl(photoUrl: string): string | undefined {
  return Object.hasOwn(galleryPhotos, photoUrl) ? galleryPhotos[photoUrl as keyof typeof galleryPhotos] : undefined;
}

/** Gallery IDs are not image IDs: use the host's post embed for Imgur albums. */
export function imgurEmbedUrl(photoUrl: string): string | undefined {
  let url: URL;
  try { url = new URL(photoUrl); } catch { return undefined; }
  if (url.protocol !== "https:" || !["imgur.com", "www.imgur.com"].includes(url.hostname)) return undefined;
  const match = /^\/(a\/|gallery\/)?(?:[\w-]+-)?([a-zA-Z0-9]{7})\/?$/.exec(url.pathname);
  if (!match) return undefined;
  const prefix = match[1] ? "a/" : "";
  return `https://imgur.com/${prefix}${match[2]}/embed?pub=true`;
}
