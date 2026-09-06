import type { ReactNode } from "react";

export default function DataTable({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    // No `sticky` header here on purpose: `overflow-x-auto` on this wrapper makes it establish its
    // own scroll container (per the CSS overflow spec, `overflow-x: auto` forces `overflow-y` to
    // compute as `auto`/a scroll container too, even though only horizontal scrolling is intended),
    // so a `position: sticky` thead sticks to *this* div's box instead of the page — it ends up
    // floating over the first data row rather than pinned to the top. Tried `overflow-y-clip` to
    // suppress that without losing horizontal scroll; it didn't hold up across browsers in practice.
    // No other table on the site uses a sticky header, so plain (non-sticky) is the safe default here too.
    <div data-component="DataTable" className={`overflow-x-auto rounded-xl border border-ctp-surface1 ${className}`}>
      <table className="w-max min-w-full text-sm [&_thead]:bg-ctp-mantle [&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2">
        {children}
      </table>
    </div>
  );
}
