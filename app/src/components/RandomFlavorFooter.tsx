import { Link } from "react-router-dom";
import { useRandomFlavorCard } from "../features/cards/useRandomFlavorCard";

export default function RandomFlavorFooter() {
  const card = useRandomFlavorCard();
  if (!card?.flavor) return null;

  const flavor = card.flavor.trim().replace(/^["""](.*)["""]$/, "$1");

  return (
    <footer className="mx-auto mt-12 max-w-3xl px-4 py-8 text-center">
      <p className="text-sm italic text-ctp-subtext0">"{flavor}"</p>
      <Link to={`/cards/${card.slug}`} className="mt-1 inline-block text-xs text-ctp-subtext0 hover:text-ctp-blue">
        — {card.name}
      </Link>
    </footer>
  );
}
