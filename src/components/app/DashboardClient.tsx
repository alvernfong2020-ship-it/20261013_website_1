"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Input,
  Stat,
} from "@/components/ui/primitives";
import { ConfirmDialog, Modal, useToast } from "@/components/ui/overlays";
import { api } from "@/lib/client";
import { formatRelative } from "@/lib/utils";
import { STORY_TYPE_LABELS } from "@/lib/ai/contract";
import { cn } from "@/lib/utils";

export type StoryListItem = {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  storyType: string;
  updatedAt: string;
  publishedAt: string | null;
  versions: number;
};

const STATUS_TONE = {
  DRAFT: "neutral",
  PUBLISHED: "success",
  ARCHIVED: "warning",
} as const;

export function DashboardClient({
  stories: initial,
  usage,
  activity,
  suggestedTemplates,
}: {
  stories: StoryListItem[];
  usage: {
    plan: string;
    aiCreditsUsed: number;
    aiCreditsLimit: number;
    publishedCount: number;
    publishedLimit: number;
  };
  activity: { id: string; action: string; createdAt: string }[];
  suggestedTemplates: { slug: string; title: string; category: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [stories, setStories] = useState(initial);
  const [filter, setFilter] = useState<"ALL" | "DRAFT" | "PUBLISHED" | "ARCHIVED">("ALL");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<StoryListItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StoryListItem | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return stories.filter((s) => {
      if (filter !== "ALL" && s.status !== filter) return false;
      if (needle && !s.title.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [stories, filter, q]);

  async function createStory(templateSlug?: string) {
    setCreating(true);
    try {
      const res = await api<{ story: { id: string } }>("/api/stories", {
        method: "POST",
        json: { title: "Untitled story", templateSlug },
      });
      toast.push({ title: "Story created", tone: "success" });
      router.push(`/editor/${res.story.id}`);
    } catch (error) {
      toast.push({ title: "Could not create story", description: (error as Error).message, tone: "error" });
    } finally {
      setCreating(false);
    }
  }

  async function doPublish(story: StoryListItem) {
    setBusy(story.id);
    try {
      await api(`/api/stories/${story.id}/publish`, { method: "POST" });
      setStories((prev) =>
        prev.map((s) =>
          s.id === story.id
            ? { ...s, status: "PUBLISHED", publishedAt: new Date().toISOString(), versions: s.versions + 1 }
            : s,
        ),
      );
      toast.push({ title: "Published", description: `/s/${story.slug} is live.`, tone: "success" });
    } catch (error) {
      toast.push({ title: "Could not publish", description: (error as Error).message, tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function doUnpublish(story: StoryListItem) {
    setBusy(story.id);
    try {
      await api(`/api/stories/${story.id}/unpublish`, { method: "POST" });
      setStories((prev) => prev.map((s) => (s.id === story.id ? { ...s, status: "DRAFT" } : s)));
      toast.push({ title: "Unpublished", description: "The public page is no longer live.", tone: "info" });
    } catch (error) {
      toast.push({ title: "Could not unpublish", description: (error as Error).message, tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function doDuplicate(story: StoryListItem) {
    setBusy(story.id);
    try {
      const res = await api<{ story: StoryListItem }>(`/api/stories/${story.id}/duplicate`, { method: "POST" });
      setStories((prev) => [
        {
          id: res.story.id,
          title: res.story.title,
          slug: res.story.slug,
          status: "DRAFT",
          storyType: story.storyType,
          updatedAt: new Date().toISOString(),
          publishedAt: null,
          versions: 0,
        },
        ...prev,
      ]);
      toast.push({ title: "Duplicated", tone: "success" });
    } catch (error) {
      toast.push({ title: "Could not duplicate", description: (error as Error).message, tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function doRename() {
    if (!renameTarget) return;
    const title = renameValue.trim();
    if (title.length < 1) return;
    setBusy(renameTarget.id);
    try {
      await api(`/api/stories/${renameTarget.id}`, { method: "PATCH", json: { title } });
      setStories((prev) => prev.map((s) => (s.id === renameTarget.id ? { ...s, title } : s)));
      toast.push({ title: "Renamed", tone: "success" });
      setRenameTarget(null);
    } catch (error) {
      toast.push({ title: "Could not rename", description: (error as Error).message, tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function doDelete() {
    if (!deleteTarget) return;
    setBusy(deleteTarget.id);
    try {
      await api(`/api/stories/${deleteTarget.id}`, { method: "DELETE" });
      setStories((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast.push({ title: "Story deleted", description: "It can be restored from the database if needed.", tone: "info" });
      setDeleteTarget(null);
    } catch (error) {
      toast.push({ title: "Could not delete", description: (error as Error).message, tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  const counts = {
    ALL: stories.length,
    DRAFT: stories.filter((s) => s.status === "DRAFT").length,
    PUBLISHED: stories.filter((s) => s.status === "PUBLISHED").length,
    ARCHIVED: stories.filter((s) => s.status === "ARCHIVED").length,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl">Your stories</h1>
          <p className="mt-1 text-sm text-ink-soft">Draft, publish and measure your scroll-driven stories.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/dashboard/generate" variant="secondary">
            Generate with AI
          </ButtonLink>
          <Button onClick={() => createStory()} loading={creating}>
            New story
          </Button>
        </div>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat
          label="AI credits"
          value={`${usage.aiCreditsUsed} / ${usage.aiCreditsLimit === Infinity ? "∞" : usage.aiCreditsLimit}`}
          hint="Resets monthly"
        />
        <Stat
          label="Published stories"
          value={`${usage.publishedCount} / ${usage.publishedLimit === Infinity ? "∞" : usage.publishedLimit}`}
          hint={`On the ${usage.plan.toLowerCase()} plan`}
        />
        <Stat label="Total stories" value={String(stories.length)} hint="Including drafts" />
      </div>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filter stories" className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-paper-raised p-1">
          {(["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition-colors",
                filter === f ? "bg-ink text-paper" : "text-ink-soft hover:text-ink",
              )}
            >
              {f.toLowerCase()} <span className="text-xs opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>
        <div className="w-full sm:max-w-xs">
          <label className="sr-only" htmlFor="story-search">
            Search stories
          </label>
          <Input
            id="story-search"
            placeholder="Search stories…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={stories.length === 0 ? "No stories yet" : "Nothing matches"}
            description={
              stories.length === 0
                ? "Start from a template, describe an idea, or paste existing content — the editor takes it from there."
                : "Try a different search or filter."
            }
            action={
              stories.length === 0 ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => createStory()}>Create a blank story</Button>
                  <ButtonLink href="/dashboard/templates" variant="secondary">
                    Browse templates
                  </ButtonLink>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQ("");
                    setFilter("ALL");
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((story) => (
            <li key={story.id}>
              <Card className="flex h-full flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <Badge tone={STATUS_TONE[story.status]}>{story.status.toLowerCase()}</Badge>
                  <span className="text-xs text-ink-faint">{formatRelative(story.updatedAt)}</span>
                </div>
                <h2 className="mt-3 font-display text-lg leading-snug">
                  <Link href={`/editor/${story.id}`} className="hover:text-accent">
                    {story.title}
                  </Link>
                </h2>
                <p className="mt-1 text-xs text-ink-faint">
                  {STORY_TYPE_LABELS[story.storyType] ?? "Story"} · {story.versions} version
                  {story.versions === 1 ? "" : "s"}
                </p>

                <div className="mt-4 flex flex-1 flex-wrap items-end gap-2">
                  <ButtonLink href={`/editor/${story.id}`} size="sm">
                    Open
                  </ButtonLink>
                  <ButtonLink href={`/preview/${story.id}`} size="sm" variant="secondary">
                    Preview
                  </ButtonLink>
                  {story.status === "PUBLISHED" ? (
                    <>
                      <ButtonLink href={`/s/${story.slug}`} size="sm" variant="ghost">
                        View live ↗
                      </ButtonLink>
                      <Button size="sm" variant="ghost" onClick={() => doUnpublish(story)} loading={busy === story.id}>
                        Unpublish
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => doPublish(story)} loading={busy === story.id}>
                      Publish
                    </Button>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1 border-t border-line pt-3 text-xs">
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-ink-soft hover:bg-paper-sunken"
                    onClick={() => {
                      setRenameTarget(story);
                      setRenameValue(story.title);
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-ink-soft hover:bg-paper-sunken"
                    onClick={() => doDuplicate(story)}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-danger hover:bg-danger/10"
                    onClick={() => setDeleteTarget(story)}
                  >
                    Delete
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-14 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="templates-heading">
          <h2 id="templates-heading" className="font-display text-2xl">
            Start from a template
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {suggestedTemplates.map((t) => (
              <li key={t.slug}>
                <Card className="flex h-full flex-col p-4">
                  <Badge tone="neutral" className="self-start">
                    {t.category}
                  </Badge>
                  <p className="mt-3 flex-1 font-medium">{t.title}</p>
                  <Button size="sm" variant="secondary" className="mt-3 self-start" onClick={() => createStory(t.slug)}>
                    Use template
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
          <ButtonLink href="/dashboard/templates" variant="ghost" size="sm" className="mt-3 px-0">
            Browse all templates →
          </ButtonLink>
        </section>

        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="font-display text-2xl">
            Recent activity
          </h2>
          {activity.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-line-strong p-6 text-sm text-ink-faint">
              No activity yet. Actions like publishing and generating are recorded here.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-paper-raised">
              {activity.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="text-ink-soft">{prettyAction(a.action)}</span>
                  <span className="text-xs text-ink-faint">{formatRelative(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Modal
        open={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        title="Rename story"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button onClick={doRename} loading={busy === renameTarget?.id}>
              Save
            </Button>
          </>
        }
      >
        <label className="block text-sm font-medium" htmlFor="rename-input">
          Title
        </label>
        <Input
          id="rename-input"
          className="mt-1.5"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doRename()}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        loading={busy === deleteTarget?.id}
        title="Delete this story?"
        description={`"${deleteTarget?.title}" will be removed from your workspace. This cannot be undone from the interface.`}
        confirmLabel="Delete story"
      />
    </div>
  );
}

function prettyAction(action: string) {
  return action
    .replace(/\./g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
