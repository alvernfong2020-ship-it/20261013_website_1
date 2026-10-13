"use client";

import React from "react";
import { cn } from "@/lib/utils";

/* Lightweight, dependency-free SVG charts with accessible text summaries. */

export function Chart({
  title,
  summary,
  children,
  className,
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn("rounded-xl border border-line bg-paper-raised p-4", className)}>
      <figcaption className="text-sm font-medium">{title}</figcaption>
      <p className="sr-only">{summary}</p>
      <div className="mt-3" aria-hidden="true">
        {children}
      </div>
    </figure>
  );
}

export function TrendChart({
  data,
  metric,
}: {
  data: { date: string; pageViews: number; visitors: number }[];
  metric: "pageViews" | "visitors";
}) {
  const width = 600;
  const height = 160;
  const pad = 8;
  const max = Math.max(1, ...data.map((d) => d[metric]));
  const step = data.length > 1 ? (width - pad * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = pad + i * step;
    const y = height - pad - (d[metric] / max) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${(width - pad).toFixed(1)},${height - pad} L${pad},${height - pad} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" preserveAspectRatio="none" role="img">
      <path d={area} fill="var(--accent-soft)" opacity="0.55" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" />
      {points
        .filter((_, i) => i % Math.ceil(data.length / 6) === 0)
        .map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="var(--accent-strong)" />
        ))}
    </svg>
  );
}

export function BarList({
  items,
  labelKey,
}: {
  items: { label: string; value: number }[];
  labelKey?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2" aria-label={labelKey}>
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-center justify-between text-xs">
            <span className="truncate text-ink-soft" title={item.label}>
              {item.label}
            </span>
            <span className="text-ink-faint">{item.value}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper-sunken">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
      {items.length === 0 && <li className="text-xs text-ink-faint">No data in this range.</li>}
    </ul>
  );
}
