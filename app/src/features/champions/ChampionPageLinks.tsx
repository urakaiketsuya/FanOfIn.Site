import { NavLink } from "react-router-dom";
import { championNameToSlug } from "../../lib/championSlug";

export default function ChampionPageLinks({ championName }: { championName: string }) {
  const overview = `/champions/${championNameToSlug(championName)}`;
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-control items-center rounded-full px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ctp-blue ${isActive ? "bg-ctp-blue/15 text-ctp-blue ring-1 ring-inset ring-ctp-blue" : "text-ctp-subtext1 hover:bg-ctp-surface0"}`;
  return <nav aria-label="Champion pages" className="my-4 flex flex-wrap gap-2">
    <NavLink end to={overview} className={linkClass}>Overview</NavLink>
    <NavLink end to={`${overview}/stats`} className={linkClass}>Tournament stats</NavLink>
  </nav>;
}
