"use client";

import { useMemo, useRef, useState } from "react";

interface Series {
  key: string;
  label: string;
  /** CSS var reference, e.g. "var(--series-1)" — color follows the entity. */
  color: string;
}

interface Point {
  date: string;
  [key: string]: string | number;
}

/**
 * SVG line chart: 2px lines, hairline grid, crosshair + shared tooltip on
 * hover, 8px hover markers with a 2px surface ring. One y-axis, always.
 */
export function LineChart({
  data,
  series,
  height = 220,
}: {
  data: Point[];
  series: Series[];
  height?: number;
}) {
  const width = 640;
  const pad = { top: 12, right: 12, bottom: 24, left: 44 };
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { max, xFor, yFor, paths } = useMemo(() => {
    const max =
      Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0))) * 1.1;
    const xFor = (i: number) =>
      pad.left + (i / Math.max(1, data.length - 1)) * (width - pad.left - pad.right);
    const yFor = (v: number) =>
      pad.top + (1 - v / max) * (height - pad.top - pad.bottom);
    const paths = series.map((s) => ({
      ...s,
      d: data
        .map((d, i) => `${i ? "L" : "M"}${xFor(i).toFixed(1)},${yFor(Number(d[s.key]) || 0).toFixed(1)}`)
        .join(""),
    }));
    return { max, xFor, yFor, paths };
  }, [data, series, height]);

  const gridLines = 4;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const i = Math.round(
      ((x - pad.left) / (width - pad.left - pad.right)) * (data.length - 1),
    );
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  }

  const h = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full touch-none select-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Line chart: ${series.map((s) => s.label).join(", ")}`}
      >
        {Array.from({ length: gridLines + 1 }, (_, g) => {
          const v = (max / gridLines) * g;
          const y = yFor(v);
          return (
            <g key={g}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="var(--hairline)" strokeWidth="1" />
              <text x={pad.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="var(--text-muted)" style={{ fontVariantNumeric: "tabular-nums" }}>
                {Intl.NumberFormat("en", { notation: "compact" }).format(v)}
              </text>
            </g>
          );
        })}
        <line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} stroke="var(--baseline)" strokeWidth="1" />
        {[0, Math.floor(data.length / 2), data.length - 1].map((i) => (
          <text key={i} x={xFor(i)} y={height - 8} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} fontSize="10" fill="var(--text-muted)">
            {String(data[i]?.date ?? "").slice(5)}
          </text>
        ))}

        {hover !== null && (
          <line x1={xFor(hover)} x2={xFor(hover)} y1={pad.top} y2={height - pad.bottom} stroke="var(--baseline)" strokeWidth="1" strokeDasharray="3 3" />
        )}

        {paths.map((p) => (
          <path key={p.key} d={p.d} fill="none" stroke={p.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {hover !== null &&
          series.map((s) => (
            <circle
              key={s.key}
              cx={xFor(hover)}
              cy={yFor(Number(data[hover][s.key]) || 0)}
              r="4"
              fill={s.color}
              stroke="var(--surface-1)"
              strokeWidth="2"
            />
          ))}
      </svg>

      {h && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg bg-surface px-3 py-2 text-xs shadow-md ring-1 ring-[var(--ring)]"
          style={{
            left: `${(xFor(hover!) / width) * 100}%`,
            transform: xFor(hover!) > width * 0.6 ? "translateX(-110%)" : "translateX(10%)",
          }}
        >
          <p className="font-medium text-ink">{h.date}</p>
          {series.map((s) => (
            <p key={s.key} className="mt-0.5 flex items-center gap-1.5 text-ink-2">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}:{" "}
              <span className="font-medium text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>
                {Number(h[s.key]).toLocaleString()}
              </span>
            </p>
          ))}
        </div>
      )}

      {series.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-2">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
