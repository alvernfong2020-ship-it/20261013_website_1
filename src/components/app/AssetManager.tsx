"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
import { Badge, Button, EmptyState, Input, Skeleton } from "@/components/ui/primitives";
import { ConfirmDialog, useToast } from "@/components/ui/overlays";
import { api } from "@/lib/client";

export type AssetItem = {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  kind: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  referenceCount?: number;
};

export function AssetManager({ initialAssets }: { initialAssets: AssetItem[] }) {
  const toast = useToast();
  const [assets, setAssets] = useState(initialAssets);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<AssetItem | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const res = await api<{ assets: AssetItem[] }>("/api/assets");
      setAssets(res.assets);
    } finally {
      setLoading(false);
    }
  }

  function upload(file: File) {
    setUploading(true);
    setProgress(0);
    // XHR gives us upload progress; fetch does not.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/assets");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        setAssets((prev) => [data.asset, ...prev]);
        toast.push({ title: "Uploaded", description: file.name, tone: "success" });
      } else {
        let message = "Upload failed.";
        try {
          message = JSON.parse(xhr.responseText).error || message;
        } catch {
          /* ignore */
        }
        toast.push({ title: "Could not upload", description: message, tone: "error" });
      }
    };
    xhr.onerror = () => {
      setUploading(false);
      toast.push({ title: "Upload failed", description: "Network error.", tone: "error" });
    };
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  }

  async function remove(asset: AssetItem) {
    try {
      await api(`/api/assets/${asset.id}`, { method: "DELETE" });
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      toast.push({ title: "Asset removed", tone: "info" });
    } catch (e) {
      toast.push({ title: "Could not remove", description: (e as Error).message, tone: "error" });
    } finally {
      setDeleteTarget(null);
    }
  }

  const filtered = assets.filter(
    (a) =>
      (!kind || a.kind === kind) && a.filename.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[12rem] flex-1">
          <Input placeholder="Search by filename…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search assets" />
        </div>
        <select
          aria-label="Filter by type"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="rounded-lg border border-line bg-paper-raised px-3 py-2.5 text-sm"
        >
          <option value="">All types</option>
          <option value="image">Images</option>
          <option value="video">Video</option>
          <option value="document">Documents</option>
        </select>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm text-paper hover:bg-accent-strong">
          {uploading ? `Uploading ${progress}%` : "Upload"}
          <input
            type="file"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </label>
        <Button variant="ghost" size="sm" onClick={reload} loading={loading}>
          Refresh
        </Button>
      </div>

      {uploading && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}

      <p className="mt-4 text-sm text-ink-faint" aria-live="polite">
        {filtered.length} asset{filtered.length === 1 ? "" : "s"} · types: images, MP4/WebM, PDF and documents up
        to 15MB
      </p>

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={assets.length === 0 ? "No assets yet" : "No matches"}
            description={assets.length === 0 ? "Upload images, video or documents to use across your stories." : "Try another search or filter."}
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((a) => (
            <li key={a.id} className="overflow-hidden rounded-xl border border-line bg-paper-raised">
              {a.kind === "image" ? (
                <img src={a.url} alt={a.filename} className="h-36 w-full object-cover" loading="lazy" />
              ) : (
                <div className="grid h-36 w-full place-items-center bg-paper-sunken text-sm text-ink-faint">
                  {a.kind}
                </div>
              )}
              <div className="p-3">
                <p className="truncate text-sm" title={a.filename}>
                  {a.filename}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <Badge tone="neutral">{a.kind}</Badge>
                  <span className="text-xs text-ink-faint">{(a.size / 1024).toFixed(0)} KB</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-ink-soft underline underline-offset-2 hover:text-ink"
                  >
                    Open
                  </a>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(a)}
                    className="text-xs text-danger underline underline-offset-2"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {loading && <Skeleton className="mt-4 h-6 w-32" />}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove(deleteTarget)}
        title="Remove this asset?"
        description={`"${deleteTarget?.filename}" will be deleted. Stories that reference its URL will show a broken image.`}
        confirmLabel="Remove asset"
      />
    </div>
  );
}
