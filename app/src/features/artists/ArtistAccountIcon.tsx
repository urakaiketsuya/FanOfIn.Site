/*! Font Awesome Free by Fonticons, Inc. https://fontawesome.com
 * Brand icons licensed CC BY 4.0: https://creativecommons.org/licenses/by/4.0/ */
import {
  faArtstation, faFacebook, faInstagram, faLinktree, faPatreon,
  faPixiv, faWeibo, faXTwitter, faYoutube,
} from '@fortawesome/free-brands-svg-icons';

const brands = {
  ArtStation: faArtstation, Facebook: faFacebook, Instagram: faInstagram,
  Linktree: faLinktree, Patreon: faPatreon, Pixiv: faPixiv,
  Weibo: faWeibo, X: faXTwitter, YouTube: faYoutube,
};

export default function ArtistAccountIcon({ platform }: { platform: string }) {
  const brand = brands[platform as keyof typeof brands];
  const className = 'h-5 w-5 shrink-0';
  if (!brand) return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
    <circle cx="12" cy="12" r="9" />
    <ellipse cx="12" cy="12" rx="4" ry="9" />
    <path d="M3 12h18M5 6.5h14M5 17.5h14" />
  </svg>;
  const [width, height, , , paths] = brand.icon;
  return <svg aria-hidden="true" focusable="false" viewBox={`0 0 ${width} ${height}`} fill="currentColor" className={className}>
    {(Array.isArray(paths) ? paths : [paths]).map((path, index) => <path key={index} d={path} />)}
  </svg>;
}
