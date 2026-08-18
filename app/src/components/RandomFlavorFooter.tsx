import { Link } from "react-router-dom";
import { useRandomFlavorCard } from "../features/cards/useRandomFlavorCard";
import SyncStatus from "./SyncStatus";

export default function RandomFlavorFooter() {
  const card = useRandomFlavorCard();
  const flavor = card?.flavor ? card.flavor.trim().replace(/^["""](.*)["""]$/, "$1") : null;

  return (
    <footer className="mx-auto mt-12 max-w-3xl px-4 py-8 text-center">
      {flavor && card && (
        <>
          <p className="text-sm italic text-ctp-subtext0">"{flavor}"</p>
          <Link to={`/cards/${card.slug}`} className="mt-1 inline-block text-xs text-ctp-subtext0 hover:text-ctp-blue">
            — {card.name}
          </Link>
        </>
      )}
      <p className="mt-6 text-[11px] text-ctp-subtext0/70">
        Grand Archive is a trademark of Weebs of the Shore. This is an unofficial fan project and is not affiliated
        with or endorsed by Weebs of the Shore.
      </p>
      <p className="mt-1 text-[11px] text-ctp-subtext0/70">
        This site is built and maintained with AI assistance. Card data, stats, and analysis are generated
        automatically — please verify anything important against official sources.
      </p>
      <div className="mt-3">
        <SyncStatus />
      </div>
    </footer>
  );
}
