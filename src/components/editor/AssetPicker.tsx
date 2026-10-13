"use client";

import React, { useEffect, useState } from "react";
import { Button, EmptyState, Input, Badge } from "@/components/ui/primitives";
import { Modal, useToast } from "@/components/ui/overlays";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";

/* eslint-disable @next/next/no-img-element */

export type AssetItem = {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  kind: string;
  size: number;
  width: number | null;
  height: number | null;
};

export function AssetPickerModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (asset: AssetItem) => void;
}) {
  const toast = useToast();
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ assets: AssetItem[] }>("/api/assets");
      setAssets(res.assets);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) void load();
  }, [open]);

  async function upload(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/assets", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      setAssets((prev) => [data.asset, ...prev]);
      toast.push({ title: "Uploaded", description: file.name, tone: "success" });
    } catch (e) {
      toast.push({ title: "Could not upload", description: (e as Error).message, tone: "error" });
    } finally {
      setUploading(false);
    }
  }

  const filtered = assets.filter((a) => a.filename.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <Modal open={open} onClose={onClose} title="Choose an asset" size="lg" footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input placeholder="Search by filename…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-line-strong bg-paper-raised px-4 py-2.5 text-sm text-ink-soft hover:border-ink hover:text-ink">
          {uploading ? "Uploading…" : "Upload file"}
          <input
            type="file"
            className="sr-only"
            accept="image/*,video/mp4,video/webm,application/pdf,text/plain,text/markdown"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {loading && <p className="mt-4 text-sm text-ink-faint">Loading assets…</p>}
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState
            title={assets.length === 0 ? "No assets yet" : "No matches"}
            description={assets.length === 0 ? "Upload an image, video or document to use in your story." : "Try another search."}
          />
        </div>
      )}

      {filtered.length > 0 && (
        <ul className="mt-4 grid max-h-80 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
          {filtered.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(a);
                  onClose();
                }}
                className="group w-full overflow-hidden rounded-lg border border-line text-left hover:border-accent"
              >
                {a.kind === "image" ? (
                  <img src={a.url} alt={a.filename} className="h-28 w-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid h-28 w-full place-items-center bg-paper-sunken text-xs text-ink-faint">
                    {a.kind}
                  </div>
                )}
                <div className="p-2">
                  <p className="truncate text-xs">{a.filename}</p>
                  <Badge tone="neutral" className="mt-1">
                    {a.kind}
                  </Badge>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export function TemplateSidebar({
  onUse,
}: {
  onUse: (templateId: string, mode: "replace" | "append") => void;
}) {
  const [items, setItems] = useState<{ id: string; slug: string; title: string; category: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ templates: { id: string; slug: string; title: string; category: string }[] }>("/api/templates")
      .then((r) => setItems(r.templates))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-4 text-sm text-ink-faint">Loading templates…</p>;

  return (
    <ul className="space-y-1 p-2">
      {items.map((t) => (
        <li key={t.id} className="rounded-lg border border-transparent p-2 hover:bg-paper-sunken">
          <p className="text-sm font-medium">{t.title}</p>
          <p className="text-xs text-ink-faint">{t.category}</p>
          <div className="mt-2 flex gap-1">
            <button
              type="button"
              onClick={() => onUse(t.id, "append")}
              className={cn("rounded px-2 py-1 text-xs text-ink-soft hover:bg-paper-raised hover:text-ink")}
            >
              Append sections
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
