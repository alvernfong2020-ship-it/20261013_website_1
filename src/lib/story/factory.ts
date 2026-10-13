import { nanoid } from "nanoid";
import {
  emptySectionDefaults,
  type SectionType,
  type StoryDocument,
  type StorySection,
} from "./schema";

export function newId(prefix = "sec"): string {
  return `${prefix}_${nanoid(10)}`;
}

export function createSection(type: SectionType, overrides: Partial<StorySection> = {}): StorySection {
  const defaults = emptySectionDefaults[type] ?? {};
  return {
    id: newId(),
    type,
    media: [],
    layout: { width: "wide", columns: "1", align: "left", mediaPosition: "right", mediaWidth: 50, gap: "md" },
    background: { type: "none", overlay: 0, fixed: false },
    animation: { preset: "fade-in", mode: "in-view", duration: 600, delay: 0, distance: 40 },
    responsive: { hideOnMobile: false, hideOnDesktop: false, stackOnMobile: true, reducedHeightOnMobile: false },
    spacing: { top: "lg", bottom: "lg" },
    interaction: { type: "none" },
    data: {},
    ...defaults,
    ...overrides,
  } as StorySection;
}

export function createEmptyStory(partial: Partial<StoryDocument> = {}): StoryDocument {
  const now = new Date().toISOString();
  const id = partial.id ?? `story_${nanoid(12)}`;
  return {
    schemaVersion: 1,
    id,
    title: partial.title ?? "Untitled story",
    slug: partial.slug ?? "untitled-story",
    description: partial.description ?? "",
    storyType: partial.storyType ?? "ONE_PAGE",
    theme: partial.theme ?? "editorial",
    typography: partial.typography ?? { displayFont: "serif", bodyFont: "sans", scale: "normal" },
    palette: partial.palette ?? {
      paper: "#f7f4ef",
      ink: "#171614",
      accent: "#b4622b",
      accentSoft: "#f0e2d5",
      line: "#e2dcd1",
      muted: "#56514a",
    },
    sections: partial.sections ?? [createSection("hero")],
    navigation: partial.navigation ?? { showProgress: true, showChapterNav: false, showBackToTop: true, stickyHeader: true },
    seo: partial.seo ?? { title: partial.title ?? "", description: partial.description ?? "", noIndex: false, keywords: [] },
    footer: partial.footer ?? { showBranding: true, links: [] },
    createdAt: partial.createdAt ?? now,
    updatedAt: now,
  };
}

/** Deep clone a section and assign it a fresh id. */
export function duplicateSection(section: StorySection): StorySection {
  return { ...structuredClone(section), id: newId() };
}

export function reorder<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  if (from < 0 || from >= next.length) return next;
  const [item] = next.splice(from, 1);
  const target = to < 0 ? 0 : to > next.length ? next.length : to;
  next.splice(target, 0, item);
  return next;
}

/** Sitemap-ready summary used by marketing template cards and previews. */
export function summarizeSection(section: StorySection): string {
  return section.heading || section.eyebrow || section.type.replace(/-/g, " ");
}
