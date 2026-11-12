import { loadActiveDeckWorkspace } from "../persistence/deckWorkspace";
import { Link } from "react-router-dom";

export type DeckTool = "builder" | "analysis" | "review";

const TOOLS: { key: DeckTool; label: string; to: string }[] = [
  { key: "builder", label: "Deck", to: "/decks/draft" },
  { key: "analysis", label: "Report", to: "/deck-analysis" },
  { key: "review", label: "Improve", to: "/deck-review" },
];

export default function DeckToolNav({ activeTool }: { activeTool: DeckTool }) {
  const identity = loadActiveDeckWorkspace(sessionStorage)?.deckIdentity;
  const editorPath = identity?.startsWith("draft:") ? `/decks/new?workspace=${encodeURIComponent(identity.slice(6))}` : "/decks/draft";
  return <nav aria-label="Deck tools" className="grid grid-cols-3">
    {TOOLS.map((tool) => <Link key={tool.key} to={tool.key === "builder" ? editorPath : tool.to} aria-current={tool.key === activeTool ? "page" : undefined} className={`flex min-h-control items-center justify-center border-b-2 px-3 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ctp-blue ${tool.key === activeTool ? "border-ctp-blue bg-ctp-blue/5 text-ctp-blue" : "border-transparent text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text"}`}>{tool.label}</Link>)}
  </nav>;
}
