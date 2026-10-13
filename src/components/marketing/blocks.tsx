import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Section({
  children,
  className,
  id,
  tone = "paper",
  as: Tag = "section",
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  tone?: "paper" | "raised" | "sunken" | "ink";
  as?: React.ElementType;
}) {
  const tones = {
    paper: "bg-paper",
    raised: "bg-paper-raised",
    sunken: "bg-paper-sunken",
    ink: "bg-ink text-paper",
  };
  return (
    <Tag id={id} className={cn(tones[tone], className)}>
      {children}
    </Tag>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  lede,
  align = "left",
  className,
  action,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start",
        action && "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={cn(align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl")}>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="text-display text-3xl sm:text-4xl md:text-5xl">{title}</h2>
        {lede && <p className="mt-4 text-lg text-ink-soft">{lede}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function FeatureGrid({
  items,
  columns = 3,
}: {
  items: { title: string; body: string; href?: string; eyebrow?: string; media?: React.ReactNode }[];
  columns?: 2 | 3 | 4;
}) {
  const cols = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[columns];
  return (
    <div className={cn("mt-12 grid gap-x-8 gap-y-10", cols)}>
      {items.map((item) => {
        const inner = (
          <>
            {item.media && <div className="mb-4">{item.media}</div>}
            {item.eyebrow && <p className="eyebrow mb-2">{item.eyebrow}</p>}
            <h3 className="font-display text-xl">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.body}</p>
            {item.href && <span className="mt-3 inline-block text-sm font-medium text-accent">Explore →</span>}
          </>
        );
        return item.href ? (
          <Link key={item.title} href={item.href} className="group block rounded-lg">
            {inner}
          </Link>
        ) : (
          <div key={item.title}>{inner}</div>
        );
      })}
    </div>
  );
}

export function StepList({
  steps,
}: {
  steps: { n: string; title: string; body: string }[];
}) {
  return (
    <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
      {steps.map((s) => (
        <li key={s.n} className="bg-paper-raised p-8">
          <span className="font-display text-4xl text-accent">{s.n}</span>
          <h3 className="mt-4 font-display text-2xl">{s.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function StatRow({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <dl className="grid gap-8 border-y border-line py-10 sm:grid-cols-3">
      {stats.map((s) => (
        <div key={s.label}>
          <dt className="text-sm text-ink-soft">{s.label}</dt>
          <dd className="font-display text-4xl">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "max-w-none space-y-5 text-[1.0625rem] leading-[1.75] text-ink-soft",
        "[&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:text-ink",
        "[&_h3]:mt-8 [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-ink",
        "[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2",
        "[&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5",
        "[&_strong]:text-ink",
        className,
      )}
    >
      {children}
    </div>
  );
}
