"use client";

import React, { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, EmptyState, Stat } from "@/components/ui/primitives";
import { BarList, Chart, TrendChart } from "@/components/app/Charts";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import type { AnalyticsSummary } from "@/lib/analytics";

const RANGES = [7, 30, 90];

export function AnalyticsDashboard({
  storyId,
  storyTitle,
  sectionLabels,
  initialSummary,
}: {
  storyId: string;
  storyTitle: string;
  sectionLabels: Record<string, string>;
  initialSummary: AnalyticsSummary;
}) {
  const [range, setRange] = useState(initialSummary.rangeDays);
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);
  const [metric, setMetric] = useState<"pageViews" | "visitors">("pageViews");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ summary: AnalyticsSummary }>(`/api/analytics/${storyId}?range=${range}`)
      .then((r) => {
        if (!cancelled) setSummary(r.summary);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [range, storyId]);

  const hasData = summary.pageViews > 0 || summary.uniqueVisitors > 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">{storyTitle}</h1>
          <p className="mt-1 text-sm text-ink-soft">Aggregated, privacy-conscious engagement for the last {range} days.</p>
        </div>
        <div className="inline-flex rounded-full border border-line bg-paper-raised p-1" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm",
                range === r ? "bg-ink text-paper" : "text-ink-soft hover:text-ink",
              )}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {summary.demo && (
        <div className="mt-4">
          <Alert tone="info" title="Demo workspace">
            The numbers below come from a labelled demo workspace. They are not production metrics.
          </Alert>
        </div>
      )}

      {!hasData ? (
        <div className="mt-8">
          <EmptyState
            title="No activity in this range"
            description="Once people visit the published story, page views, scroll depth and section visibility appear here. Only first-party, aggregated events are recorded."
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Page views" value={summary.pageViews.toLocaleString()} />
            <Stat label="Unique visitors" value={summary.uniqueVisitors.toLocaleString()} hint="Per session, deduplicated" />
            <Stat label="Avg. engagement" value={`${summary.avgEngagementSeconds}s`} hint="Estimated from scroll depth" />
            <Stat label="CTA clicks" value={summary.ctaClicks.toLocaleString()} />
          </div>

          <Card className="mt-6 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Traffic over time</h2>
              <div className="inline-flex rounded-full border border-line p-0.5" role="group" aria-label="Metric">
                <button
                  type="button"
                  aria-pressed={metric === "pageViews"}
                  onClick={() => setMetric("pageViews")}
                  className={cn("rounded-full px-3 py-1 text-xs", metric === "pageViews" ? "bg-ink text-paper" : "text-ink-soft")}
                >
                  Page views
                </button>
                <button
                  type="button"
                  aria-pressed={metric === "visitors"}
                  onClick={() => setMetric("visitors")}
                  className={cn("rounded-full px-3 py-1 text-xs", metric === "visitors" ? "bg-ink text-paper" : "text-ink-soft")}
                >
                  Visitors
                </button>
              </div>
            </div>
            <Chart
              title=""
              summary={`Daily ${metric === "pageViews" ? "page views" : "unique visitors"} from ${summary.trend[0]?.date} to ${summary.trend[summary.trend.length - 1]?.date}. Peak ${Math.max(...summary.trend.map((t) => t[metric]), 0)}.`}
              className="border-0 p-0"
            >
              <TrendChart data={summary.trend} metric={metric} />
            </Chart>
          </Card>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Chart
              title="Scroll depth distribution"
              summary={`Sessions reaching each depth: ${summary.scrollDepth.map((b) => `${b.bucket}%: ${b.count}`).join(", ")}.`}
            >
              <BarList items={summary.scrollDepth.map((b) => ({ label: `${b.bucket}%`, value: b.count }))} />
            </Chart>

            <Chart
              title="Section visibility"
              summary={
                summary.sectionViews.length
                  ? `Most-viewed sections: ${summary.sectionViews.slice(0, 5).map((s) => `${sectionLabels[s.sectionId] ?? s.sectionId} (${s.views})`).join(", ")}.`
                  : "No section visibility recorded."
              }
            >
              <BarList
                items={summary.sectionViews.map((s) => ({
                  label: sectionLabels[s.sectionId] ?? s.sectionId,
                  value: s.views,
                }))}
              />
            </Chart>
          </div>

          <Card className="mt-6 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Form submissions</h2>
              <Badge tone="neutral">{summary.formSubmissions}</Badge>
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              Counted from the story&apos;s contact and lead forms. Spam-flagged submissions are excluded.
            </p>
          </Card>
        </>
      )}

      {loading && <p className="mt-4 text-xs text-ink-faint" aria-live="polite">Refreshing…</p>}
      <div className="mt-4">
        <Button variant="ghost" size="sm" onClick={() => setRange(range)}>
          Reload
        </Button>
      </div>
    </div>
  );
}
