"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, ButtonLink, CardGridSkeleton, EmptyState, Input, Select } from "@/components/ui/primitives";
import { Modal, useToast } from "@/components/ui/overlays";
import { cn } from "@/lib/utils";

export type TemplateCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  storyType: string;
  tags: string[];
  thumbnail: string | null;
  version: number;
};

const FAV_KEY = "scrollwright:favourite-templates";

export function TemplateBrowser({
  items,
  categories,
  signedIn,
}: {
  items: TemplateCard[];
  categories: string[];
  signedIn: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<"relevance" | "recent">("relevance");
  const [favOnly, setFavOnly] = useState(false);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [preview, setPreview] = useState<TemplateCard | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    try {
      setFavourites(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));
    } catch {
      setFavourites([]);
    }
  }, []);

  const toggleFav = (slug: string) => {
    setFavourites((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = items.filter((t) => {
      if (category && t.category !== category) return false;
      if (favOnly && !favourites.includes(t.slug)) return false;
      if (!needle) return true;
      return (
        t.title.toLowerCase().includes(needle) ||
        t.description.toLowerCase().includes(needle) ||
        t.category.toLowerCase().includes(needle) ||
        t.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });
    list = [...list].sort((a, b) =>
      sort === "recent" ? a.slug.localeCompare(b.slug) : a.title.localeCompare(b.title),
    );
    return list;
  }, [items, q, category, sort, favOnly, favourites]);

  async function startFromTemplate(tpl: TemplateCard) {
    if (!signedIn) {
      router.push(`/sign-up?template=${tpl.slug}`);
      return;
    }
    setCreating(tpl.slug);
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: tpl.id, title: "Untitled story" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not create the story.");
      toast.push({ title: "Draft created", description: `Based on ${tpl.title}.`, tone: "success" });
      router.push(`/editor/${body.story.id}`);
    } catch (error) {
      toast.push({ title: "Could not create story", description: (error as Error).message, tone: "error" });
    } finally {
      setCreating(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-xl border border-line bg-paper-raised p-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label className="sr-only" htmlFor="template-search">
            Search templates
          </label>
          <Input
            id="template-search"
            placeholder="Search by title, description, category or tag…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <div>
            <label className="sr-only" htmlFor="template-category">
              Filter by category
            </label>
            <Select id="template-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="sr-only" htmlFor="template-sort">
              Sort
            </label>
            <Select id="template-sort" value={sort} onChange={(e) => setSort(e.target.value as never)}>
              <option value="relevance">Sort: Relevance</option>
              <option value="recent">Sort: Recent</option>
            </Select>
          </div>
          <Button
            variant={favOnly ? "primary" : "secondary"}
            aria-pressed={favOnly}
            onClick={() => setFavOnly((v) => !v)}
          >
            ★ Favourites
          </Button>
        </div>
      </div>

      <p className="mt-4 text-sm text-ink-faint" aria-live="polite">
        {filtered.length} template{filtered.length === 1 ? "" : "s"}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No templates match"
            description="Try a different search term or clear the filters."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQ("");
                  setCategory("");
                  setFavOnly(false);
                }}
              >
                Clear filters
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tpl) => (
            <article key={tpl.id} className="flex flex-col overflow-hidden rounded-xl border border-line bg-paper-raised">
              <button
                type="button"
                onClick={() => setPreview(tpl)}
                className="group relative block text-left"
                aria-label={`Preview ${tpl.title}`}
              >
                <img
                  src={tpl.thumbnail ?? undefined}
                  alt=""
                  width={400}
                  height={280}
                  loading="lazy"
                  className="h-48 w-full border-b border-line object-cover transition-transform group-hover:scale-[1.02]"
                />
              </button>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <Badge tone="neutral">{tpl.category}</Badge>
                  <button
                    type="button"
                    onClick={() => toggleFav(tpl.slug)}
                    aria-pressed={favourites.includes(tpl.slug)}
                    aria-label={favourites.includes(tpl.slug) ? "Remove from favourites" : "Add to favourites"}
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-lg leading-none",
                      favourites.includes(tpl.slug) ? "text-accent" : "text-ink-faint hover:text-ink",
                    )}
                  >
                    {favourites.includes(tpl.slug) ? "★" : "☆"}
                  </button>
                </div>
                <h3 className="mt-3 font-display text-lg">{tpl.title}</h3>
                <p className="mt-1.5 flex-1 text-sm text-ink-soft">{tpl.description}</p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={() => startFromTemplate(tpl)} loading={creating === tpl.slug}>
                    Use template
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPreview(tpl)}>
                    Details
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.title ?? ""}
        description={preview?.description}
        size="lg"
        footer={
          preview && (
            <>
              <Button variant="ghost" onClick={() => setPreview(null)}>
                Close
              </Button>
              <ButtonLink href={`/s/${preview.slug}`} variant="secondary">
                View live
              </ButtonLink>
              <Button onClick={() => startFromTemplate(preview)} loading={creating === preview.slug}>
                Use this template
              </Button>
            </>
          )
        }
      >
        {preview && (
          <>
            <img
              src={preview.thumbnail ?? undefined}
              alt={`${preview.title} preview`}
              width={640}
              height={400}
              className="h-56 w-full rounded-lg border border-line object-cover"
            />
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-ink-faint">Category</dt>
                <dd>{preview.category}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">Version</dt>
                <dd>v{preview.version}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {preview.tags.map((t) => (
                <Badge key={t} tone="neutral">
                  {t}
                </Badge>
              ))}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

export function TemplateBrowserSkeleton() {
  return <CardGridSkeleton count={6} />;
}
