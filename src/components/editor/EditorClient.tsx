"use client";

import React, { useState } from "react";
import { Badge, Button, ButtonLink } from "@/components/ui/primitives";
import { ConfirmDialog, Modal, useToast } from "@/components/ui/overlays";
import { OutlinePanel } from "@/components/editor/OutlinePanel";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { AssetPickerModal, TemplateSidebar, type AssetItem } from "@/components/editor/AssetPicker";
import { useEditor } from "@/components/editor/useEditor";
import { StoryRenderer } from "@/components/story/StoryRenderer";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import { createSection } from "@/lib/story/factory";
import type { SectionType, StoryDocument, StorySection } from "@/lib/story/schema";

type Device = "desktop" | "tablet" | "mobile";
type Sidebar = "outline" | "templates";

const DEVICE_WIDTH: Record<Device, string> = {
  desktop: "w-full",
  tablet: "w-[820px]",
  mobile: "w-[390px]",
};

export function EditorClient({
  initialDocument,
  initialRevision,
  storyId,
  storyStatus,
}: {
  initialDocument: StoryDocument;
  initialRevision: number;
  storyId: string;
  storyStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}) {
  const toast = useToast();
  const editor = useEditor(initialDocument, storyId, initialRevision);
  const { doc, dispatch, selected, selectedId, setSelectedId } = editor;

  const [device, setDevice] = useState<Device>("desktop");
  const [sidebar, setSidebar] = useState<Sidebar>("outline");
  const [assetPickerFor, setAssetPickerFor] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState(storyStatus);
  const [title, setTitle] = useState(doc.title);

  function updateSelected(patch: Partial<StorySection>) {
    if (!selectedId) return;
    dispatch({ type: "updateSection", id: selectedId, patch });
  }

  function applyMedia(asset: AssetItem) {
    if (assetPickerFor === "background" && selectedId) {
      dispatch({
        type: "updateSection",
        id: selectedId,
        patch: {
          background: {
            ...(selected?.background ?? { type: "none", overlay: 0, fixed: false }),
            type: "image",
            image: { url: asset.url, alt: asset.filename, focalPoint: "center", assetId: asset.id },
          },
        } as never,
      });
    } else if (selectedId) {
      dispatch({
        type: "updateSection",
        id: selectedId,
        patch: {
          media: [
            {
              url: asset.url,
              alt: asset.filename,
              assetId: asset.id,
              focalPoint: "center",
            },
          ],
        } as never,
      });
    }
    setAssetPickerFor(null);
  }

  async function useTemplate(templateId: string, mode: "append" | "replace") {
    try {
      const res = await api<{ template: { document: unknown; title: string } }>(`/api/templates/${templateId}`);
      const tplDoc = res.template.document as StoryDocument;
      const sections =
        mode === "replace"
          ? tplDoc.sections
          : [...doc.sections, ...tplDoc.sections.map((s) => createSection(s.type, { ...s, id: undefined } as never))];
      dispatch({
        type: "updateMeta",
        patch: {
          sections,
          ...(mode === "replace"
            ? { typography: tplDoc.typography, palette: tplDoc.palette, theme: tplDoc.theme }
            : {}),
        } as never,
      });
      toast.push({
        title: mode === "replace" ? "Template applied" : "Sections appended",
        description: res.template.title,
        tone: "success",
      });
    } catch (e) {
      toast.push({ title: "Could not load template", description: (e as Error).message, tone: "error" });
    }
  }

  async function publish() {
    setPublishing(true);
    try {
      await editor.saveNow();
      await api(`/api/stories/${storyId}/publish`, { method: "POST" });
      setStatus("PUBLISHED");
      toast.push({
        title: "Published",
        description: `Live at /s/${doc.slug}. A frozen version was created.`,
        tone: "success",
      });
    } catch (e) {
      toast.push({ title: "Could not publish", description: (e as Error).message, tone: "error" });
    } finally {
      setPublishing(false);
    }
  }

  async function unpublish() {
    try {
      await api(`/api/stories/${storyId}/unpublish`, { method: "POST" });
      setStatus("DRAFT");
      toast.push({ title: "Unpublished", tone: "info" });
    } catch (e) {
      toast.push({ title: "Could not unpublish", description: (e as Error).message, tone: "error" });
    }
  }

  const saveLabel = {
    saved: editor.lastSavedAt ? `Saved ${editor.lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Saved",
    saving: "Saving…",
    dirty: "Unsaved changes",
    conflict: "Save conflict",
    error: "Save failed",
  }[editor.saveState];

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper-raised px-3 py-2">
        <ButtonLink href="/dashboard" variant="ghost" size="sm">
          ← Dashboard
        </ButtonLink>
        <div className="flex min-w-0 items-center gap-2">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              dispatch({ type: "updateMeta", patch: { title: e.target.value } });
            }}
            aria-label="Story title"
            className="min-w-[8rem] max-w-[24rem] rounded-md border border-transparent bg-transparent px-2 py-1 font-display text-lg hover:border-line focus:border-accent focus:outline-none"
          />
          <Badge tone={status === "PUBLISHED" ? "success" : "neutral"}>{status.toLowerCase()}</Badge>
        </div>

        <div className="mx-auto" />

        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" disabled={!editor.canUndo} onClick={() => dispatch({ type: "undo" })} title="Undo (Ctrl+Z)">
            ↶
          </Button>
          <Button size="sm" variant="ghost" disabled={!editor.canRedo} onClick={() => dispatch({ type: "redo" })} title="Redo (Ctrl+Shift+Z)">
            ↷
          </Button>
          <span
            className={cn(
              "px-2 text-xs",
              editor.saveState === "saved" && "text-ink-faint",
              editor.saveState === "saving" && "text-ink-soft",
              editor.saveState === "dirty" && "text-warning",
              (editor.saveState === "conflict" || editor.saveState === "error") && "text-danger",
            )}
            aria-live="polite"
          >
            {saveLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setShowVersions(true)}>
            Versions
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setPreviewOpen(true)}>
            Preview
          </Button>
          {status === "PUBLISHED" ? (
            <>
              <ButtonLink href={`/s/${doc.slug}`} size="sm" variant="secondary">
                View live ↗
              </ButtonLink>
              <Button size="sm" variant="ghost" onClick={unpublish}>
                Unpublish
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={publish} loading={publishing}>
              Publish
            </Button>
          )}
        </div>
      </div>

      {editor.saveState === "conflict" && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-b border-warning/40 bg-warning/10 px-4 py-2 text-sm">
          <span>{editor.saveError}</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              const fresh = await api<{ document: StoryDocument; story: { revision: number } }>(`/api/stories/${storyId}`);
              await editor.reloadFromServer(fresh.document, fresh.story.revision);
              toast.push({ title: "Reloaded latest version", tone: "info" });
            }}
          >
            Reload latest
          </Button>
        </div>
      )}
      {editor.saveState === "error" && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-b border-danger/40 bg-danger/10 px-4 py-2 text-sm">
          <span>{editor.saveError} Your changes are still in the editor.</span>
          <Button size="sm" variant="secondary" onClick={() => editor.saveNow()}>
            Retry save
          </Button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Left sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-paper-raised md:flex">
          <div className="flex border-b border-line" role="tablist" aria-label="Sidebar">
            {(["outline", "templates"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={sidebar === t}
                onClick={() => setSidebar(t)}
                className={cn(
                  "flex-1 px-3 py-2.5 text-sm font-medium capitalize",
                  sidebar === t ? "border-b-2 border-accent text-ink" : "text-ink-soft hover:text-ink",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {sidebar === "outline" ? (
              <OutlinePanel
                sections={doc.sections}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onMove={(from, to) => dispatch({ type: "moveSection", from, to })}
                onAdd={(type: SectionType) => {
                  dispatch({ type: "addSection", sectionType: type });
                  toast.push({ title: `Added ${type.replace(/-/g, " ")} section`, tone: "info" });
                }}
                onDuplicate={(id) => dispatch({ type: "duplicateSection", id })}
                onDelete={(id) => setConfirmDelete(id)}
              />
            ) : (
              <div className="h-full overflow-y-auto">
                <TemplateSidebar onUse={useTemplate} />
              </div>
            )}
          </div>
        </aside>

        {/* Canvas */}
        <div className="flex min-w-0 flex-1 flex-col bg-paper-sunken/40">
          <div className="flex items-center justify-center gap-1 border-b border-line bg-paper-raised/60 px-3 py-1.5">
            <span className="sr-only">Preview width</span>
            {(["desktop", "tablet", "mobile"] as const).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={device === d}
                onClick={() => setDevice(d)}
                className={cn(
                  "rounded px-3 py-1 text-xs capitalize",
                  device === d ? "bg-ink text-paper" : "text-ink-soft hover:text-ink",
                )}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <div className={cn("mx-auto transition-[width] duration-200", DEVICE_WIDTH[device])}>
              <div className="overflow-hidden rounded-xl border border-line bg-paper shadow-sm">
                <div className={device === "desktop" ? "" : "origin-top"}>
                  <StoryRenderer document={doc} mode="preview" showProgress={false} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right properties */}
        <aside className="hidden w-80 shrink-0 border-l border-line bg-paper-raised lg:block">
          <PropertiesPanel
            doc={doc}
            section={selected}
            onChange={updateSelected}
            onMetaChange={(patch) => dispatch({ type: "updateMeta", patch })}
            onReplaceMedia={() => setAssetPickerFor("media")}
          />
        </aside>
      </div>

      <AssetPickerModal
        open={assetPickerFor !== null}
        onClose={() => setAssetPickerFor(null)}
        onPick={applyMedia}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) dispatch({ type: "deleteSection", id: confirmDelete });
          setConfirmDelete(null);
        }}
        title="Delete this section?"
        description="The section will be removed from the story. You can undo this with Ctrl+Z."
        confirmLabel="Delete section"
      />

      <VersionsModal
        open={showVersions}
        onClose={() => setShowVersions(false)}
        storyId={storyId}
        onRestore={async (versionId) => {
          try {
            const res = await api<{ story: { revision: number }; restoredFrom: number }>(
              `/api/stories/${storyId}/versions`,
              { method: "POST", json: { versionId } },
            );
            const fresh = await api<{ document: StoryDocument; story: { revision: number } }>(`/api/stories/${storyId}`);
            await editor.reloadFromServer(fresh.document, fresh.story.revision);
            setShowVersions(false);
            toast.push({ title: `Restored version ${res.restoredFrom} into the draft`, tone: "success" });
          } catch (e) {
            toast.push({ title: "Could not restore", description: (e as Error).message, tone: "error" });
          }
        }}
      />

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Read-only preview"
        description="Exactly what a visitor sees, including scroll animations."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            <ButtonLink href={`/preview/${storyId}`} variant="secondary">
              Open full-screen preview
            </ButtonLink>
          </>
        }
      >
        <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-line">
          <StoryRenderer document={doc} mode="preview" />
        </div>
      </Modal>
    </div>
  );
}

function VersionsModal({
  open,
  onClose,
  storyId,
  onRestore,
}: {
  open: boolean;
  onClose: () => void;
  storyId: string;
  onRestore: (versionId: string) => void;
}) {
  const [versions, setVersions] = useState<{ id: string; version: number; title: string; publishedAt: string }[]>([]);
  const [publishedVersionId, setPublishedVersionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    api<{ versions: { id: string; version: number; title: string; publishedAt: string }[]; publishedVersionId: string | null }>(
      `/api/stories/${storyId}/versions`,
    )
      .then((r) => {
        setVersions(r.versions);
        setPublishedVersionId(r.publishedVersionId);
      })
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [open, storyId]);

  return (
    <Modal open={open} onClose={onClose} title="Version history" size="md" footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      {loading && <p className="text-sm text-ink-faint">Loading versions…</p>}
      {!loading && versions.length === 0 && (
        <p className="text-sm text-ink-faint">
          No versions yet. Publishing creates a frozen, restorable version.
        </p>
      )}
      <ul className="divide-y divide-line">
        {versions.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium">
                Version {v.version}
                {v.id === publishedVersionId && (
                  <Badge tone="success" className="ml-2">
                    live
                  </Badge>
                )}
              </p>
              <p className="text-xs text-ink-faint">
                {v.title} · {new Date(v.publishedAt).toLocaleString()}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => onRestore(v.id)}>
              Restore into draft
            </Button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
