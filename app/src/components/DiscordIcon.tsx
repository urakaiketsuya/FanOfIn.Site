import { faDiscord } from "@fortawesome/free-brands-svg-icons";

/*! Font Awesome brand icon: CC BY 4.0, https://fontawesome.com/license/free */
export default function DiscordIcon() {
  const [width, height, , , paths] = faDiscord.icon;
  return <svg aria-hidden="true" focusable="false" viewBox={`0 0 ${width} ${height}`} fill="currentColor" className="mr-2 h-5 w-5 shrink-0">
    {(Array.isArray(paths) ? paths : [paths]).map((path, index) => <path key={index} d={path} />)}
  </svg>;
}

