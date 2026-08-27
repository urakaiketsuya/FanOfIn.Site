import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import CardHoverPreview from "../../components/CardHoverPreview";
import ElementIcon from "../../components/ElementIcon";
import ElementRail from "../../components/ElementRail";
import PageHeader from "../../components/ui/PageHeader";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { buildDeckBuilderPath, deckBuilderParamsFromDecklist } from "../../lib/deckBuilderLink";
import { encodeCustomDecks } from "../../lib/compareShareLink";
import { useCardCatalog } from "../cards/useCardCatalog";
import { buildDecklistText } from "../events/DecklistView";
import { officialProductDecks, officialProductsSource, PRODUCT_LABELS, type OfficialProductCardLine, type OfficialProductDeck } from "./data";

const SECTION_LABELS: Record<keyof OfficialProductDeck["cards"], string> = {
  material: "Material",
  main: "Main",
  sideboard: "Sideboard",
  mastery: "Mastery",
  token: "Tokens",
  pantheon: "Pantheon",
  generated: "Generated",
  status: "Statuses",
};

const SECTION_ORDER = ["material", "main", "sideboard", "mastery", "token", "pantheon", "generated", "status"] as const;

function asDecklist(deck: OfficialProductDeck): OmnidexDecklist {
  const lines = (section: "main" | "material" | "sideboard") => deck.cards[section].map((card) => ({ card: card.name, quantity: card.quantity }));
  return { main: lines("main"), material: lines("material"), sideboard: lines("sideboard") };
}

function ProductCardLine({ line, cardsByName }: { line: OfficialProductCardLine; cardsByName: Map<string, Card> }) {
  const card = cardsByName.get(line.name);
  return (
    <li className="flex min-w-0 items-center gap-1.5 py-0.5 text-sm">
      <span className="w-6 shrink-0 text-right tabular-nums text-ctp-subtext0">{line.quantity}x</span>
      {card?.element && card.element !== "NORM" && <ElementIcon element={card.element} size={14} />}
      {card ? (
        <CardHoverPreview image={card.editions[0]?.image} alt={line.name}>
          <Link to={`/cards/${card.slug}`} className="truncate text-ctp-text hover:text-ctp-blue">{line.name}</Link>
        </CardHoverPreview>
      ) : (
        <span className="truncate text-ctp-text">{line.name}</span>
      )}
      {line.set && line.collectorNumber && <span className="ml-auto shrink-0 text-[10px] text-ctp-overlay0">{line.set} {line.collectorNumber}</span>}
    </li>
  );
}

function ProductDeckCard({
  deck,
  cardsByName,
  compareSelected,
  compareDisabled,
  onToggleCompare,
}: {
  deck: OfficialProductDeck;
  cardsByName: Map<string, Card>;
  compareSelected: boolean;
  compareDisabled: boolean;
  onToggleCompare: () => void;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const decklist = useMemo(() => asDecklist(deck), [deck]);
  const builderPath = useMemo(() => {
    const params = deckBuilderParamsFromDecklist(decklist, cardsByName);
    if (!params) return null;
    const path = buildDeckBuilderPath(params.championName, params.spiritFilter, params.lockedCards, params.lockedSections);
    return deck.productCode === "RDOPD" ? `${path}${path.includes("?") ? "&" : "?"}format=pantheon` : path;
  }, [deck, decklist, cardsByName]);
  const total = deck.cards.main.reduce((sum, card) => sum + card.quantity, 0);
  const productLabel = PRODUCT_LABELS[deck.productCode] ?? deck.productCode;
  const releaseLabel = deck.releaseDate ? (deck.productCode === "DOAp" ? "Jan 2023" : new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(deck.releaseDate))) : null;
  const elements = useMemo(() => Array.from(new Set(
    deck.cards.material
      .map((line) => cardsByName.get(line.name))
      .filter((card): card is Card => card?.types.includes("CHAMPION") === true)
      .flatMap((card) => card.elements)
      .filter((element) => element !== "NORM"),
  )), [deck, cardsByName]);

  async function copyDecklist() {
    const extras = (["mastery", "token", "pantheon"] as const)
      .filter((section) => deck.cards[section].length > 0)
      .map((section) => `# ${SECTION_LABELS[section]}\n${deck.cards[section].map((line) => `${line.quantity} ${line.name}`).join("\n")}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText([buildDecklistText(decklist), extras].filter(Boolean).join("\n\n"));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 1500);
  }

  return (
    <article className="relative overflow-hidden rounded-xl border border-ctp-surface0 bg-ctp-mantle/70 shadow-sm">
      <ElementRail elements={elements} />
      <div className="p-4 pl-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ctp-blue">{productLabel}{releaseLabel && <span className="ml-2 font-normal normal-case text-ctp-subtext0">· {deck.releaseDate! > new Date().toISOString().slice(0, 10) ? "Releases" : "Released"} {releaseLabel}</span>}</p>
            <h2 className="mt-1 text-lg font-semibold text-ctp-text">{deck.name}</h2>
            <p className="mt-1 text-xs text-ctp-subtext0">{deck.cards.material.length} material · {total} main{deck.cards.mastery.length ? ` · ${deck.cards.mastery.length} mastery` : ""}{deck.cards.token.length ? ` · ${deck.cards.token.length} token types` : ""}</p>
          </div>
          <span className="rounded-full border border-ctp-surface1 px-2 py-1 text-xs font-medium text-ctp-subtext1">{deck.productCode}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onToggleCompare}
            disabled={compareDisabled}
            aria-pressed={compareSelected}
            className={`rounded-md border px-2.5 py-1.5 text-xs ${
              compareSelected
                ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue"
                : "border-ctp-surface1 text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text disabled:cursor-not-allowed disabled:opacity-40"
            }`}
          >
            {compareSelected ? "Selected to compare ✓" : "Select to compare"}
          </button>
          <button type="button" onClick={copyDecklist} className="rounded-md border border-ctp-surface1 px-2.5 py-1.5 text-xs text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text">
            {copyState === "copied" ? "Copied!" : copyState === "failed" ? "Couldn't copy" : "Copy decklist"}
          </button>
          {builderPath && <Link to={builderPath} className="rounded-md border border-ctp-green px-2.5 py-1.5 text-xs text-ctp-green hover:bg-ctp-surface0">Tune in Deck Builder →</Link>}
          <a href={deck.sourceUrl} target="_blank" rel="noreferrer" className="rounded-md border border-ctp-surface1 px-2.5 py-1.5 text-xs text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text">Official source ↗</a>
        </div>
      </div>

      <details className="group border-t border-ctp-surface0">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-ctp-subtext1 hover:bg-ctp-surface0/40 hover:text-ctp-text">
          <span className="inline-block w-5 text-ctp-overlay0 transition-transform group-open:rotate-90">›</span>
          View complete list
        </summary>
        <div className="grid gap-5 border-t border-ctp-surface0 px-4 py-4 sm:grid-cols-2">
          {SECTION_ORDER.map((section) => {
            const lines = deck.cards[section];
            if (lines.length === 0) return null;
            const count = lines.reduce((sum, line) => sum + line.quantity, 0);
            return <section key={section}>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-ctp-subtext0">{SECTION_LABELS[section]} ({count})</h3>
              <ul>{lines.map((line) => <ProductCardLine key={`${line.name}:${line.set}:${line.collectorNumber}`} line={line} cardsByName={cardsByName} />)}</ul>
            </section>;
          })}
        </div>
      </details>
    </article>
  );
}

export default function OfficialProductsIndex() {
  useDocumentTitle("Official Product Decks", "Browse and copy official Grand Archive starter deck and Re:Collection decklists, then tune them in the Guided Deck Builder.");
  const catalog = useCardCatalog();
  const cardsByName = useMemo(() => new Map(catalog.map((card) => [card.name, card])), [catalog]);
  const [section, setSection] = useState<"starter" | "recollection" | "pantheon">("starter");
  const [product, setProduct] = useState("all");
  const [query, setQuery] = useState("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const products = useMemo(() => Array.from(new Set(officialProductDecks.filter((deck) => section === "pantheon" ? deck.productCode === "RDOPD" : section === "recollection" ? deck.productCode.startsWith("ReC-") : !deck.productCode.startsWith("ReC-") && deck.productCode !== "RDOPD").map((deck) => deck.productCode))), [section]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return officialProductDecks.filter((deck) => (section === "pantheon" ? deck.productCode === "RDOPD" : section === "recollection" ? deck.productCode.startsWith("ReC-") : !deck.productCode.startsWith("ReC-") && deck.productCode !== "RDOPD") && (section === "pantheon" || product === "all" || deck.productCode === product) && (!needle || deck.name.toLowerCase().includes(needle) || deck.champions.some((champion) => champion.toLowerCase().includes(needle)))).sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "") || a.name.localeCompare(b.name));
  }, [section, product, query]);
  const comparedDecks = useMemo(
    () => compareIds.map((id) => officialProductDecks.find((deck) => deck.id === id)).filter((deck): deck is OfficialProductDeck => deck !== undefined),
    [compareIds],
  );
  const comparePath = useMemo(() => {
    if (comparedDecks.length < 2) return null;
    const custom = encodeCustomDecks(comparedDecks.map((deck) => ({ label: deck.name, decklist: asDecklist(deck) })));
    return `/compare?${new URLSearchParams({ custom, panel: "compare" }).toString()}`;
  }, [comparedDecks]);
  const sectionLabel = section === "pantheon" ? "Pantheon" : section === "recollection" ? "Re:Collection" : "starter";

  function toggleCompare(id: string) {
    setCompareIds((current) => current.includes(id) ? current.filter((selected) => selected !== id) : current.length < 4 ? [...current, id] : current);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title="Official Product Decks" description={<>Starter decks, Re:Collection lists, and Pantheon starters published by Grand Archive. Copy a list as printed or open it in the Guided Deck Builder to start tuning. Source data is attributed to <a href={officialProductsSource} target="_blank" rel="noreferrer" className="text-ctp-blue hover:underline">GrandArchive on Silvie.org</a>.</>} />

      <div className="mb-4 inline-flex rounded-lg border border-ctp-surface1 bg-ctp-mantle p-1" role="tablist" aria-label="Official deck format">
        {(["starter", "recollection", "pantheon"] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={section === value} onClick={() => { setSection(value); setProduct("all"); }} className={`rounded-md px-3 py-1.5 text-sm ${section === value ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}>{value === "pantheon" ? "Pantheon" : value === "recollection" ? "Re:Collection" : "Starter"}</button>)}
      </div>

      <div className="mb-6 flex flex-wrap gap-3 rounded-xl border border-ctp-surface0 bg-ctp-mantle/50 p-3">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Champion or product…" aria-label="Search official decks" className="min-w-52 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text placeholder:text-ctp-overlay0" />
        <select value={product} onChange={(event) => setProduct(event.target.value)} aria-label="Product" className="rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text">
          <option value="all">All products ({officialProductDecks.filter((deck) => section === "pantheon" ? deck.productCode === "RDOPD" : section === "recollection" ? deck.productCode.startsWith("ReC-") : !deck.productCode.startsWith("ReC-") && deck.productCode !== "RDOPD").length})</option>
          {products.map((code) => <option key={code} value={code}>{PRODUCT_LABELS[code] ?? code}</option>)}
        </select>
      </div>

      <div className={`mb-6 rounded-xl border p-3 shadow-sm backdrop-blur transition-colors ${compareIds.length > 0 ? "sticky top-16 z-30 border-ctp-blue/50 bg-ctp-base/95" : "border-ctp-surface0 bg-ctp-mantle/30"}`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-48 flex-1">
            <p className="text-sm font-semibold text-ctp-text">Compare {sectionLabel} decks</p>
            <p className="mt-0.5 text-xs text-ctp-subtext0">
              {compareIds.length === 0 && `Select two to four ${sectionLabel.toLowerCase()} decks below.`}
              {compareIds.length === 1 && "One selected — choose one more."}
              {compareIds.length >= 2 && compareIds.length < 4 && `Ready to compare ${compareIds.length} decks — add up to ${4 - compareIds.length} more.`}
              {compareIds.length === 4 && "Four selected — ready to compare."}
            </p>
          </div>
          {comparedDecks.map((deck) => (
            <button key={deck.id} type="button" onClick={() => toggleCompare(deck.id)} title={`Remove ${deck.name}`} className="rounded-full border border-ctp-blue/50 bg-ctp-base px-2.5 py-1 text-xs text-ctp-blue hover:border-ctp-red hover:text-ctp-red">
              {deck.name} ×
            </button>
          ))}
          {comparePath && <Link to={comparePath} className="rounded-md bg-ctp-blue px-3 py-2 text-sm font-semibold text-ctp-base hover:brightness-110">Compare selected →</Link>}
        </div>
      </div>

      <p className="mb-3 text-xs text-ctp-subtext0">Showing {visible.length} official deck{visible.length === 1 ? "" : "s"}</p>
      <div className="grid items-start gap-4 lg:grid-cols-2">{visible.map((deck) => <ProductDeckCard key={deck.id} deck={deck} cardsByName={cardsByName} compareSelected={compareIds.includes(deck.id)} compareDisabled={compareIds.length === 4 && !compareIds.includes(deck.id)} onToggleCompare={() => toggleCompare(deck.id)} />)}</div>
      {visible.length === 0 && <p className="rounded-xl border border-ctp-surface0 p-8 text-center text-sm text-ctp-subtext1">No official products match those filters.</p>}
    </div>
  );
}
