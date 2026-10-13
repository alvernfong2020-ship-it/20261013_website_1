"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Badge, Button, ButtonLink, Card, Input, Label, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/overlays";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import { STORY_TYPE_LABELS, TONES, VISUAL_STYLES } from "@/lib/ai/contract";

type Mode = "describe" | "import";
type JobState = { id: string; status: string; step: string; progress: number; error?: string | null; demo?: boolean };

const STEPS = ["Preparing content", "Planning story", "Generating sections", "Preparing visuals", "Saving draft"];

export function GenerationWizard({
  aiStatus,
  templates,
}: {
  aiStatus: { configured: boolean; provider: string | null; model: string | null; notice: string | null };
  templates: { slug: string; title: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>(params.get("mode") === "import" ? "import" : "describe");
  const [prompt, setPrompt] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [audience, setAudience] = useState(params.get("goal") || "");
  const [storyType, setStoryType] = useState("ONE_PAGE");
  const [tone, setTone] = useState("editorial");
  const [visualStyle, setVisualStyle] = useState(params.get("style") || "editorial");
  const [brandNotes, setBrandNotes] = useState("");
  const [running, setRunning] = useState(false);
  const [job, setJob] = useState<JobState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current); }, []);

  async function start() {
    setError(null);
    if (mode === "describe" && prompt.trim().length < 8) {
      setError("Describe your story in a sentence or two.");
      return;
    }
    if (mode === "import" && !sourceText.trim() && !sourceUrl.trim()) {
      setError("Paste some content or provide a URL to import.");
      return;
    }

    setRunning(true);
    try {
      const res = await api<{ jobId: string; demo: boolean; storyId?: string; notice?: string }>("/api/ai/generate", {
        method: "POST",
        json: {
          prompt: mode === "describe" ? prompt : "",
          sourceText: mode === "import" ? sourceText : undefined,
          sourceUrl: mode === "import" ? sourceUrl || undefined : undefined,
          audience: audience || undefined,
          storyType,
          tone,
          visualStyle,
          brandNotes: brandNotes || undefined,
        },
      });

      if (res.demo) {
        toast.push({
          title: "Running in demo mode",
          description: "No model provider is configured — a structured story was composed locally from your input.",
          tone: "info",
        });
      }

      setJob({ id: res.jobId, status: "RUNNING", step: "Planning story", progress: 10 });
      poll(res.jobId);
    } catch (e) {
      setRunning(false);
      setError((e as Error).message);
    }
  }

  function poll(jobId: string) {
    pollRef.current = window.setInterval(async () => {
      try {
        const state = await api<JobState>(`/api/ai/jobs/${jobId}`);
        setJob(state);
        if (state.status === "SUCCEEDED" || state.status === "FAILED" || state.status === "CANCELLED") {
          if (pollRef.current) window.clearInterval(pollRef.current);
          setRunning(false);
          if (state.status === "SUCCEEDED") {
            const result = await api<{ storyId?: string; output?: { storyId?: string } }>(`/api/ai/jobs/${jobId}`);
            const storyId = result.storyId || result.output?.storyId;
            toast.push({ title: "Draft ready", tone: "success" });
            if (storyId) router.push(`/editor/${storyId}`);
            else router.push("/dashboard");
          } else if (state.status === "FAILED") {
            setError(state.error || "Generation failed. You can retry.");
          }
        }
      } catch {
        if (pollRef.current) window.clearInterval(pollRef.current);
        setRunning(false);
      }
    }, 1200);
  }

  const activeStepIndex = job ? Math.max(0, STEPS.findIndex((s) => s.toLowerCase().includes((job.step || "").split("_")[0]))) : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl">Create with AI</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Describe what you want, or bring existing content. The pipeline plans a structure, drafts each section and
        validates the result before saving a draft.
      </p>

      {!aiStatus.configured && (
        <div className="mt-6">
          <Alert tone="warning" title="Demo mode — no model provider configured">
            {aiStatus.notice} You can still use this wizard; the result will be clearly labelled as a demo.
          </Alert>
        </div>
      )}
      {aiStatus.configured && (
        <div className="mt-6">
          <Badge tone="success">
            Live provider: {aiStatus.provider} · {aiStatus.model}
          </Badge>
        </div>
      )}

      <div className="mt-8 inline-flex rounded-full border border-line bg-paper-raised p-1" role="group" aria-label="Input mode">
        {(["describe", "import"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium capitalize",
              mode === m ? "bg-ink text-paper" : "text-ink-soft hover:text-ink",
            )}
          >
            {m === "describe" ? "Describe an idea" : "Import content"}
          </button>
        ))}
      </div>

      <Card className="mt-4 p-6">
        {mode === "describe" ? (
          <div>
            <Label htmlFor="prompt">What is the story about?</Label>
            <Textarea
              id="prompt"
              rows={6}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A product launch story for our new analytics dashboard, aimed at operations leads. Emphasise the time saved each week and include three concrete metrics."
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="sourceText">Paste your content</Label>
              <Textarea
                id="sourceText"
                rows={8}
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Paste a document, report, proposal or rough notes…"
              />
            </div>
            <div>
              <Label htmlFor="sourceUrl">…or import from a public URL</Label>
              <Input
                id="sourceUrl"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com/article"
              />
              <p className="mt-1.5 text-xs text-ink-faint">
                Fetched server-side with SSRF protections. Private and link-local addresses are refused.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="storyType">Story type</Label>
            <select
              id="storyType"
              className="w-full rounded-lg border border-line bg-paper-raised px-3.5 py-2.5 text-sm"
              value={storyType}
              onChange={(e) => setStoryType(e.target.value)}
            >
              {Object.entries(STORY_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="visualStyle">Visual style</Label>
            <select
              id="visualStyle"
              className="w-full rounded-lg border border-line bg-paper-raised px-3.5 py-2.5 text-sm"
              value={visualStyle}
              onChange={(e) => setVisualStyle(e.target.value)}
            >
              {VISUAL_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="tone">Tone</Label>
            <select
              id="tone"
              className="w-full rounded-lg border border-line bg-paper-raised px-3.5 py-2.5 text-sm"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            >
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="audience">Audience</Label>
            <Input
              id="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Who is reading this?"
            />
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="brandNotes">Brand guidelines (optional)</Label>
          <Textarea
            id="brandNotes"
            rows={3}
            value={brandNotes}
            onChange={(e) => setBrandNotes(e.target.value)}
            placeholder="Colours, tone of voice, words to avoid, required phrases…"
          />
        </div>

        {error && (
          <div className="mt-4">
            <Alert tone="danger" title="Generation could not start">
              {error}
            </Alert>
            {running === false && job?.status === "FAILED" && (
              <Button className="mt-3" onClick={start}>
                Retry generation
              </Button>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={start} loading={running} disabled={running}>
            {running ? "Generating…" : "Generate story"}
          </Button>
          <ButtonLink href="/dashboard/templates" variant="ghost">
            Or start from a template
          </ButtonLink>
        </div>

        {job && (
          <div className="mt-6 rounded-lg border border-line bg-paper-sunken/50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="text-ink-faint">
                {job.status === "SUCCEEDED" ? "Complete" : job.status === "FAILED" ? "Failed" : job.step}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={job.progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${job.progress || 5}%` }} />
            </div>
            <ul className="mt-4 space-y-1.5 text-xs">
              {STEPS.map((s, i) => (
                <li key={s} className={cn("flex items-center gap-2", i <= activeStepIndex ? "text-ink" : "text-ink-faint")}>
                  <span aria-hidden="true">{i < activeStepIndex ? "✓" : i === activeStepIndex ? "•" : "○"}</span>
                  {s}
                </li>
              ))}
            </ul>
            {running && (
              <button
                type="button"
                className="mt-3 text-xs text-danger underline underline-offset-2"
                onClick={async () => {
                  if (pollRef.current) window.clearInterval(pollRef.current);
                  if (job) await api(`/api/ai/jobs/${job.id}`, { method: "DELETE" }).catch(() => undefined);
                  setRunning(false);
                  setJob(null);
                  toast.push({ title: "Generation cancelled", tone: "info" });
                }}
              >
                Cancel generation
              </button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
