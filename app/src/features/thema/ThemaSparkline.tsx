interface ThemaSparklineProps {
  values: number[];
  width?: number;
  height?: number;
}

/** Minimal inline SVG line chart — no charting library needed for a single series. */
export default function ThemaSparkline({ values, width = 640, height = 160 }: ThemaSparklineProps) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values
    .map((v, i) => `${i * stepX},${height - ((v - min) / range) * height}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full text-ctp-blue">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} />
    </svg>
  );
}
