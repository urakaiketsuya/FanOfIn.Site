/** Fallback renderer for Omnidex sub-resources whose shape varies too much to model confidently yet. */
export default function RawObject({ data }: { data: unknown }) {
  if (data === null || typeof data !== "object") {
    return <p className="text-sm text-ctp-subtext1">{String(data)}</p>;
  }

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      {Object.entries(data as Record<string, unknown>).map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-ctp-subtext0">{key}</dt>
          <dd className="text-ctp-text">
            {typeof value === "object" && value !== null ? JSON.stringify(value) : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
