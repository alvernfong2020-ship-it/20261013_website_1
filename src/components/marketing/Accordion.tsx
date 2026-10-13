"use client";

import React, { useId, useState } from "react";
import { cn } from "@/lib/utils";

export type AccordionItem = { question: string; answer: string };

/** Accessible disclosure accordion. Answers stay in the DOM for SEO/crawlers. */
export function Accordion({ items, className }: { items: AccordionItem[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <div className={cn("divide-y divide-line rounded-xl border border-line bg-paper-raised", className)}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.question}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`${baseId}-${i}`}
                id={`${baseId}-btn-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-medium text-ink">{item.question}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-ink-soft transition-transform",
                    isOpen && "rotate-45",
                  )}
                >
                  +
                </span>
              </button>
            </h3>
            <div
              id={`${baseId}-${i}`}
              role="region"
              aria-labelledby={`${baseId}-btn-${i}`}
              hidden={!isOpen}
              className="px-5 pb-5 text-sm leading-relaxed text-ink-soft"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
