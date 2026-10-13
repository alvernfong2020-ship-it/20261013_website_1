import { describe, expect, it } from "vitest";
import {
  parseStoryDocument,
  sanitizeStoryDocument,
  safeUrl,
  SECTION_TYPES,
} from "@/lib/story/schema";
import { createEmptyStory, createSection, duplicateSection, reorder } from "@/lib/story/factory";

const validDoc = {
  id: "story_1",
  title: "Hello",
  slug: "hello",
  sections: [{ id: "s1", type: "hero", heading: "Hi" }],
};

describe("story schema validation", () => {
  it("accepts a minimal valid document and applies defaults", () => {
    const res = parseStoryDocument(validDoc);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.schemaVersion).toBe(1);
    expect(res.value.palette.paper).toBeTruthy();
    expect(res.value.sections[0].type).toBe("hero");
    expect(res.value.seo.noIndex).toBe(false);
  });

  it("rejects unknown section types", () => {
    const res = parseStoryDocument({
      ...validDoc,
      sections: [{ id: "s1", type: "totally-made-up" }],
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.errors.join(" ")).toMatch(/sections\.0\.type/);
  });

  it("blocks javascript: and other unsafe URLs", () => {
    expect(safeUrl.safeParse("javascript:alert(1)").success).toBe(false);
    expect(safeUrl.safeParse("https://example.com/x.png").success).toBe(true);
    expect(safeUrl.safeParse("/api/assets/x").success).toBe(true);
    expect(safeUrl.safeParse("not a url").success).toBe(false);
  });

  it("rejects malformed hex colours", () => {
    const res = parseStoryDocument({
      ...validDoc,
      palette: { paper: "red", ink: "#111" },
    });
    expect(res.ok).toBe(false);
  });

  it("sanitize recovers by dropping invalid sections", () => {
    const res = sanitizeStoryDocument({
      ...validDoc,
      sections: [
        { id: "s1", type: "hero", heading: "Keep" },
        { id: "s2", type: "bogus-type" },
      ],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.sections).toHaveLength(1);
    expect(res.value.sections[0].heading).toBe("Keep");
  });

  it("every registered section type round-trips through the schema", () => {
    for (const type of SECTION_TYPES) {
      const doc = createEmptyStory({ sections: [createSection(type)] });
      const res = parseStoryDocument(doc);
      expect(res.ok, `section type ${type} should validate`).toBe(true);
    }
  });
});

describe("story factory helpers", () => {
  it("createSection assigns default layout/animation", () => {
    const s = createSection("rich-text");
    expect(s.id).toMatch(/^sec_/);
    expect(s.animation.preset).toBeTruthy();
    expect(s.responsive.stackOnMobile).toBe(true);
  });

  it("duplicateSection deep-clones with a fresh id", () => {
    const s = createSection("statistics");
    s.data = { items: [{ value: "1", label: "one" }] } as never;
    const copy = duplicateSection(s);
    expect(copy.id).not.toBe(s.id);
    expect(copy.data).toEqual(s.data);
    expect(copy.data).not.toBe(s.data);
  });

  it("reorder moves an item and clamps out-of-range targets", () => {
    const list = ["a", "b", "c", "d"];
    expect(reorder(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(reorder(list, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(reorder(list, 0, 99)).toEqual(["b", "c", "d", "a"]);
    expect(reorder(list, 9, 0)).toEqual(list);
  });
});
