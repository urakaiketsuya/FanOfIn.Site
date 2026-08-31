import { Fragment, type ReactNode } from "react";

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

export default function PrimerMarkdown({ markdown }: { markdown: string }) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
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
    blocks.push(<aside key={`callout-${blocks.length}`} className={`rounded-xl border p-4 ${isCombo ? "border-ctp-mauve/50 bg-ctp-mauve/10" : "border-ctp-teal/50 bg-ctp-teal/10"}`}>
      <div className="flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${isCombo ? "bg-ctp-mauve/20 text-ctp-mauve" : "bg-ctp-teal/20 text-ctp-teal"}`}>{isCombo ? "Combo" : "Package"}</span><h3 className="font-semibold text-ctp-text">{inlineMarkdown(current.title)}</h3></div>
      {current.lines.some((line) => line.trim()) && <div className="mt-3"><PrimerMarkdown markdown={current.lines.join("\n")} /></div>}
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

  return <article className="space-y-4 leading-7 text-ctp-text">{blocks}</article>;
}
