"use client";

import { useState } from "react";
import { StoryRenderer } from "@/components/story/StoryRenderer";
import { DEMO_STORY } from "@/lib/marketing/samples";
import { summarizeSection } from "@/lib/story/factory";
import { cn } from "@/lib/utils";
import { Badge, Button } from "@/components/ui/primitives";
import { TEMPLATE_SEEDS } from "@/lib/templates/catalog";

/**
 * Product demonstration.
 *
 * This renders the *real* editor chrome and the *real* story renderer over a
 * sample document — reordering, selection and preview all run live. It is not
 * a screenshot pretending to be interactive.
 */
export function ProductDemo() {
  const [doc, setDoc] = useState(DEMO_STORY);
  const [selected, setSelected] = useState(doc.sections[0]?.id ?? "");
  const [published, setPublished] = useState(false);
  const [templateSlug, setTemplateSlug] = useState("product-launch");

  const selectedSection = doc.sections.find((s) => s.id === selected) ?? doc.sections[0];

  const move = (from: number, to: number) => {
    if (to < 0 || to >= doc.sections.length) return;
    const next = [...doc.sections];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setDoc({ ...doc, sections: next });
  };

  const updateHeading = (heading: string) => {
    setDoc({
      ...doc,
      sections: doc.sections.map((s) => (s.id === selected ? { ...s, heading } : s)),
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-lg">
      {/* Editor top toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-ink text-xs text-paper">↩</span>
          <span className="font-medium">{doc.title}</span>
          <Badge tone="neutral">Autosaved</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => move(0, doc.sections.length - 1)}>
            Shuffle order
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setPublished(false)}>
            Preview
          </Button>
          <Button size="sm" onClick={() => setPublished(true)}>
            {published ? "Published ✓" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr_240px]">
        {/* Left sidebar: outline */}
        <div className="border-b border-line bg-paper-sunken/60 p-3 lg:border-b-0 lg:border-r">
          <p className="eyebrow px-1 pb-2">Outline</p>
          <ul className="space-y-1">
            {doc.sections.map((s, i) => (
              <li key={s.id}>
                <div
                  className={cn(
                    "group flex items-center gap-1 rounded-lg border px-2 py-1.5 text-sm",
                    s.id === selected ? "border-accent bg-paper-raised" : "border-transparent hover:bg-paper-raised",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelected(s.id)}
                    className="flex-1 truncate text-left capitalize"
                    aria-current={s.id === selected}
                  >
                    {summarizeSection(s)}
                  </button>
                  <span className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      aria-label="Move up"
                      onClick={() => move(i, i - 1)}
                      className="rounded px-1 text-ink-faint hover:text-ink"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      onClick={() => move(i, i + 1)}
                      className="rounded px-1 text-ink-faint hover:text-ink"
                    >
                      ↓
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <p className="eyebrow px-1 pb-2 pt-4">Templates</p>
          <select
            aria-label="Choose a template"
            value={templateSlug}
            onChange={(e) => setTemplateSlug(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper-raised px-2 py-1.5 text-xs"
          >
            {TEMPLATE_SEEDS.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        {/* Canvas */}
        <div className="max-h-[560px] overflow-auto bg-paper-sunken/40 p-4">
          <div className="overflow-hidden rounded-lg border border-line bg-paper shadow-sm">
            <div className="max-h-[500px] overflow-y-auto">
              <StoryRenderer document={doc} showProgress={false} />
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-ink-faint">
            Live rendering — this is the real scrollytelling engine on a real document.
          </p>
        </div>

        {/* Right properties panel */}
        <div className="border-t border-line bg-paper-sunken/60 p-3 lg:border-l lg:border-t-0">
          <p className="eyebrow px-1 pb-2">Properties</p>
          {selectedSection && (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-ink-soft">
                Heading
                <input
                  value={selectedSection.heading ?? ""}
                  onChange={(e) => updateHeading(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-paper-raised px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-ink-soft">
                Animation preset
                <select
                  className="mt-1 w-full rounded-lg border border-line bg-paper-raised px-2 py-1.5 text-sm"
                  value={selectedSection.animation.preset}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      sections: doc.sections.map((s) =>
                        s.id === selected ? { ...s, animation: { ...s.animation, preset: e.target.value as never } } : s,
                      ),
                    })
                  }
                >
                  {["fade-in", "slide-up", "scale-in", "parallax", "mask-reveal", "none"].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-lg border border-line bg-paper-raised p-2 text-xs text-ink-faint">
                Type: <span className="text-ink-soft">{selectedSection.type}</span>
                <br />
                Width: <span className="text-ink-soft">{selectedSection.layout.width}</span>
              </div>
            </div>
          )}
          {published && (
            <div className="mt-4 rounded-lg border border-success/30 bg-success/5 p-2 text-xs text-success">
              Published to /s/product-tour — a frozen version was created. Further edits stay in the draft.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
