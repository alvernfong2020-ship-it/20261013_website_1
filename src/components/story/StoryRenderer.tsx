"use client";

import React from "react";
import type { StoryDocument } from "@/lib/story/schema";
import { RenderedSection } from "./sections";
import { ReadingProgress } from "./engine";

/**
 * The reusable story renderer.
 *
 * Takes a validated StoryDocument and renders the full scroll experience.
 * Used by the public story page, the editor canvas, and the preview route so
 * all three stay pixel-identical.
 */
export function StoryRenderer({
  document: doc,
  mode = "published",
  showProgress = true,
  className,
}: {
  document: StoryDocument;
  mode?: "published" | "preview";
  showProgress?: boolean;
  className?: string;
}) {
  const paletteVars = {
    "--paper": doc.palette.paper,
    "--ink": doc.palette.ink,
    "--accent": doc.palette.accent,
    "--accent-soft": doc.palette.accentSoft,
    "--line": doc.palette.line,
    "--ink-soft": doc.palette.muted,
  } as React.CSSProperties;

  const fontClass =
    doc.typography.displayFont === "sans"
      ? "[--font-display:var(--font-body)]"
      : doc.typography.displayFont === "mono"
        ? "[--font-display:var(--font-mono)]"
        : "";

  return (
    <div
      className={`${fontClass} ${className ?? ""}`}
      style={{ ...paletteVars, backgroundColor: "var(--paper)", color: "var(--ink)" }}
      data-story-id={doc.id}
    >
      {showProgress && doc.navigation.showProgress && <ReadingProgress accent={doc.palette.accent} />}
      <main id="story-content">
        {doc.sections.map((section) => (
          <RenderedSection key={section.id} section={section} mode={mode} />
        ))}
      </main>
      <Footer doc={doc} mode={mode} />
    </div>
  );
}

function Footer({ doc, mode }: { doc: StoryDocument; mode: "published" | "preview" }) {
  return (
    <footer className="border-t border-line bg-paper-raised no-print">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {doc.footer.text && <p className="text-sm text-ink-soft">{doc.footer.text}</p>}
          {doc.footer.links.length > 0 && (
            <nav aria-label="Story footer" className="mt-3 flex flex-wrap gap-5 text-sm">
              {doc.footer.links.map((l) => (
                <a key={l.href} href={l.href} className="text-ink-soft hover:text-ink">
                  {l.label}
                </a>
              ))}
            </nav>
          )}
        </div>
        {doc.footer.showBranding && (
          <p className="text-xs text-ink-faint">
            Made with <span className="font-medium text-ink-soft">Scrollwright</span>
            {mode === "preview" && " · preview"}
          </p>
        )}
      </div>
    </footer>
  );
}
