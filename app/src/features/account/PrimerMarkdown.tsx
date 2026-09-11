import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import CardHoverPreview from "../../components/CardHoverPreview";
import CardImage from "../../components/CardImage";
import ElementIcon from "../../components/ElementIcon";
import { useCardsByNames } from "../events/useCardsByNames";
import type { OmnidexDecklist } from "@gatcg/shared";
import { conditionalComboOdds } from "../../lib/comboOdds";
import { DEFAULT_STARTING_HAND_SIZE } from "../../lib/turnToPlay";

const INLINE = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;

function safeHref(value: string): string | null {
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function inlineMarkdown(value: string): ReactNode[] {
  return value.split(INLINE).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-ctp-surface0 px-1 py-0.5 text-ctp-green">{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = safeHref(link[2]);
      return href ? <a key={index} href={href} target="_blank" rel="noopener noreferrer" className="text-ctp-blue underline">{link[1]}</a> : <Fragment key={index}>{link[1]}</Fragment>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function calloutCardCandidate(line: string): { name: string; quantity: number | null } | null {
  const bullet = line.match(/^[-*]\s+(.+)$/);
  if (!bullet) return null;
  const quantity = bullet[1].match(/^(\d+)x?\s+(.+)$/i);
  return quantity ? { name: quantity[2].trim(), quantity: Number(quantity[1]) } : { name: bullet[1].trim(), quantity: null };
}

function conditionalOptions(line: string): string[] {
  const match = line.match(/^[-*]\s+one of:\s+(.+)$/i);
  return match ? Array.from(new Set(match[1].split("|").map((name) => name.trim()).filter(Boolean))) : [];
}

export default function PrimerMarkdown({ markdown, decklist }: { markdown: string; decklist?: OmnidexDecklist }) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const candidateNames = lines.flatMap((line) => {
    const options = conditionalOptions(line);
    if (options.length > 0) return options;
    const candidate = calloutCardCandidate(line);
    return candidate ? [candidate.name] : [];
  });
  const cardsByName = useCardsByNames(candidateNames);
  const mainDeckSize = decklist?.main.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
  const mainCopies = new Map(decklist?.main.map((line) => [line.card, line.quantity]) ?? []);
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let code: string[] | null = null;
  let callout: { kind: "combo" | "package"; title: string; lines: string[] } | null = null;

  const flushParagraph = () => { if (paragraph.length) { blocks.push(<p key={`p-${blocks.length}`}>{inlineMarkdown(paragraph.join(" "))}</p>); paragraph = []; } };
  const flushList = () => { if (list.length) { blocks.push(<ul key={`ul-${blocks.length}`} className="list-disc space-y-1 pl-6">{list.map((item, index) => <li key={index}>{inlineMarkdown(item)}</li>)}</ul>); list = []; } };
  const flushCallout = () => {
    if (!callout) return;
    const current = callout;
    const isCombo = current.kind === "combo";
    const optionLineIndex = current.lines.findIndex((line) => conditionalOptions(line).length > 0);
    const optionNames = optionLineIndex >= 0 ? conditionalOptions(current.lines[optionLineIndex]) : [];
    const cardLines = current.lines.map((line, index) => ({ index, candidate: calloutCardCandidate(line) })).filter((entry): entry is { index: number; candidate: { name: string; quantity: number | null } } => entry.candidate !== null && conditionalOptions(current.lines[entry.index]).length === 0 && cardsByName.has(entry.candidate.name));
    const anchor = isCombo && optionNames.length > 0 ? cardLines[0]?.candidate.name : undefined;
    const anchorCopies = anchor ? (mainCopies.get(anchor) ?? 0) : 0;
    const optionCopies = optionNames.filter((name) => name !== anchor).reduce((sum, name) => sum + (mainCopies.get(name) ?? 0), 0);
    const openingOdds = mainDeckSize > 0 && anchor ? conditionalComboOdds(mainDeckSize, anchorCopies, optionCopies, DEFAULT_STARTING_HAND_SIZE) : null;
    const tenSeenOdds = mainDeckSize > 0 && anchor ? conditionalComboOdds(mainDeckSize, anchorCopies, optionCopies, 10) : null;
    const cardLineIndexes = new Set([...cardLines.map((entry) => entry.index), ...(optionLineIndex >= 0 ? [optionLineIndex] : [])]);
    const remainingLines = current.lines.filter((_, index) => !cardLineIndexes.has(index));
    blocks.push(<aside key={`callout-${blocks.length}`} className={`rounded-xl border p-4 ${isCombo ? "border-ctp-mauve/50 bg-ctp-mauve/10" : "border-ctp-teal/50 bg-ctp-teal/10"}`}>
      <div className="flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${isCombo ? "bg-ctp-mauve/20 text-ctp-mauve" : "bg-ctp-teal/20 text-ctp-teal"}`}>{isCombo ? "Combo" : "Package"}</span><h3 className="font-semibold text-ctp-text">{inlineMarkdown(current.title)}</h3></div>
      {cardLines.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{cardLines.map(({ index, candidate }) => {
        const card = cardsByName.get(candidate.name)!;
        return <CardHoverPreview key={`${candidate.name}-${index}`} image={card.editions[0]?.image} alt={candidate.name}><Link to={`/cards/${card.slug}`} className="flex items-center gap-2 rounded-lg border border-ctp-surface1/70 bg-ctp-base/40 p-2 hover:border-ctp-blue/60"><CardImage image={card.editions[0]?.image} alt={candidate.name} className="h-12 w-9 shrink-0 rounded object-cover object-top" /><span className="min-w-0 text-sm font-medium text-ctp-text"><span className="flex items-center gap-1 truncate"><ElementIcon element={card.element} size={14} /><span className="truncate">{candidate.name}</span></span>{candidate.quantity && <span className="text-xs font-normal text-ctp-subtext0">{candidate.quantity} copies</span>}</span></Link></CardHoverPreview>;
      })}</div>}
      {optionNames.length > 0 && <div className="mt-3"><div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Pair with one of</div><div className="flex flex-wrap items-center gap-2">{optionNames.map((name, index) => { const card = cardsByName.get(name); return <Fragment key={name}>{index > 0 && <span className="text-[10px] font-semibold text-ctp-mauve">OR</span>}{card ? <CardHoverPreview image={card.editions[0]?.image} alt={name}><Link to={`/cards/${card.slug}`} className="rounded-lg border border-ctp-mauve/40 bg-ctp-base/40 px-2.5 py-1.5 text-sm font-medium text-ctp-text hover:border-ctp-mauve">{name}</Link></CardHoverPreview> : <span className="rounded-lg border border-ctp-surface1 px-2.5 py-1.5 text-sm text-ctp-subtext1">{name}</span>}</Fragment>; })}</div></div>}
      {openingOdds && tenSeenOdds && <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-ctp-mauve/30 bg-ctp-base/35 p-3"><div><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">Opening hand</div><div className="font-semibold tabular-nums text-ctp-mauve">{(openingOdds.probability * 100).toFixed(1)}%</div></div><div><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">By 10 seen</div><div className="font-semibold tabular-nums text-ctp-mauve">{(tenSeenOdds.probability * 100).toFixed(1)}%</div></div><p className="col-span-2 text-[10px] leading-4 text-ctp-subtext0">Chance of seeing {anchor} and at least one listed option · {anchorCopies} anchor + {optionCopies} option copies in {mainDeckSize} cards.</p></div>}
      {remainingLines.some((line) => line.trim()) && <div className="mt-3"><PrimerMarkdown markdown={remainingLines.join("\n")} decklist={decklist} /></div>}
    </aside>);
    callout = null;
  };

  for (const line of lines) {
    if (callout) {
      if (line.trim() === ":::") flushCallout();
      else callout.lines.push(line);
      continue;
    }
    if (line.startsWith("```")) {
      flushParagraph(); flushList();
      if (code) { blocks.push(<pre key={`code-${blocks.length}`} className="overflow-auto rounded-lg bg-ctp-base p-4 text-sm"><code>{code.join("\n")}</code></pre>); code = null; }
      else code = [];
      continue;
    }
    if (code) { code.push(line); continue; }
    const calloutStart = line.match(/^:::(combo|package)(?:\s+(.+))?$/i);
    if (calloutStart) {
      flushParagraph(); flushList();
      const kind = calloutStart[1].toLowerCase() as "combo" | "package";
      callout = { kind, title: calloutStart[2]?.trim() || (kind === "combo" ? "Card combo" : "Card package"), lines: [] };
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList();
      const className = heading[1].length === 1 ? "text-2xl font-bold" : heading[1].length === 2 ? "text-xl font-semibold" : "text-lg font-semibold";
      const content = inlineMarkdown(heading[2]);
      blocks.push(heading[1].length === 1 ? <h2 key={`h-${blocks.length}`} className={className}>{content}</h2> : heading[1].length === 2 ? <h3 key={`h-${blocks.length}`} className={className}>{content}</h3> : <h4 key={`h-${blocks.length}`} className={className}>{content}</h4>);
    } else if (bullet) {
      flushParagraph(); list.push(bullet[1]);
    } else if (line.startsWith("> ")) {
      flushParagraph(); flushList(); blocks.push(<blockquote key={`q-${blocks.length}`} className="border-l-2 border-ctp-blue pl-4 italic text-ctp-subtext1">{inlineMarkdown(line.slice(2))}</blockquote>);
    } else if (!line.trim()) {
      flushParagraph(); flushList();
    } else paragraph.push(line.trim());
  }
  flushParagraph(); flushList();
  flushCallout();
  if (code) blocks.push(<pre key={`code-${blocks.length}`} className="overflow-auto rounded-lg bg-ctp-base p-4 text-sm"><code>{code.join("\n")}</code></pre>);

  return <article data-component="PrimerMarkdown" className="space-y-4 leading-7 text-ctp-text">{blocks}</article>;
}
