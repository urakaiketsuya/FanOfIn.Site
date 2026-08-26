import type { ReactNode } from "react";

export default function DataTable({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-ctp-surface1 ${className}`}>
      <table className="w-max min-w-full text-sm [&_thead]:sticky [&_thead]:top-14 [&_thead]:z-10 [&_thead]:bg-ctp-mantle [&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2">
        {children}
      </table>
    </div>
  );
}
