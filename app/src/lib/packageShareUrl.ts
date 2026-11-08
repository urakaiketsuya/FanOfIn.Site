import { encodePackage, type SharedPackage } from "@gatcg/shared";

/** The link holds the whole package, so it opens on any device with no account. */
export function packageShareUrl(pkg: SharedPackage, origin: string = window.location.origin): string {
  return `${origin}/cards/packages/shared?p=${encodePackage(pkg)}`;
}
