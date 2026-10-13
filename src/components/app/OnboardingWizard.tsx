"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Label, Textarea } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { api } from "@/lib/client";
import { Logo } from "@/components/ui/primitives";

const STYLES = [
  { id: "editorial", label: "Editorial", desc: "Warm paper, serif display, generous whitespace." },
  { id: "cinematic", label: "Cinematic", desc: "Dark, high-contrast, full-bleed imagery." },
  { id: "minimal", label: "Minimal", desc: "Quiet, neutral, typography-led." },
  { id: "bold", label: "Bold", desc: "Large type, strong colour, punchy sections." },
  { id: "paper", label: "Paper", desc: "Light, print-like, magazine feel." },
];

const GOALS = [
  "Marketing or campaign page",
  "Product or feature showcase",
  "Company or brand story",
  "Report, research or data story",
  "Portfolio or personal site",
  "Educational explainer",
  "Something else",
];

type Step = 0 | 1 | 2 | 3;

export function OnboardingWizard({ initialName }: { initialName: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const templateParam = params.get("template");
  const planParam = params.get("plan");

  const [step, setStep] = useState<Step>(0);
  const [goal, setGoal] = useState(GOALS[0]);
  const [audience, setAudience] = useState("");
  const [style, setStyle] = useState("editorial");
  const [hasContent, setHasContent] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persist(completed = false) {
    await api("/api/onboarding", {
      method: "POST",
      json: { goal, audience, style, hasContent: hasContent ?? false, completed, step: String(step) },
    });
  }

  async function finish(mode: "generate" | "import" | "template" | "blank") {
    setSaving(true);
    setError(null);
    try {
      await persist(true);
      if (planParam) {
        // Apply the chosen plan in development mode (server-side entitlement check).
        await api("/api/billing/checkout", {
          method: "POST",
          json: { plan: planParam, cycle: params.get("cycle") || "monthly" },
        }).catch(() => undefined);
      }
      if (mode === "template") {
        router.push(templateParam ? `/dashboard/templates?use=${templateParam}` : "/dashboard/templates");
      } else if (mode === "generate") {
        router.push(`/dashboard/generate?goal=${encodeURIComponent(goal)}&style=${style}`);
      } else if (mode === "import") {
        router.push(`/dashboard/generate?mode=import&style=${style}`);
      } else {
        const res = await api<{ story: { id: string } }>("/api/stories", {
          method: "POST",
          json: { title: "Untitled story" },
        });
        router.push(`/editor/${res.story.id}`);
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  async function next() {
    setSaving(true);
    try {
      await persist(false);
    } catch {
      /* progress persistence is best-effort */
    }
    setSaving(false);
    setStep((s) => Math.min(3, s + 1) as Step);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <Logo />
      <p className="eyebrow mt-8">
        Step {step + 1} of 4
      </p>
      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-accent" : "bg-line")} />
        ))}
      </div>

      <Card className="mt-6 p-6 sm:p-8">
        {step === 0 && (
          <div>
            <h1 className="font-display text-3xl">Welcome, {initialName.split(" ")[0]}.</h1>
            <p className="mt-2 text-sm text-ink-soft">What do you want to create first?</p>
            <ul className="mt-6 space-y-2">
              {GOALS.map((g) => (
                <li key={g}>
                  <button
                    type="button"
                    aria-pressed={goal === g}
                    onClick={() => setGoal(g)}
                    className={cn(
                      "w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                      goal === g ? "border-accent bg-accent-soft/60" : "border-line hover:border-ink",
                    )}
                  >
                    {g}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className="font-display text-3xl">Who is it for?</h1>
            <p className="mt-2 text-sm text-ink-soft">
              A sentence is plenty — it shapes the tone and the amount of context each section carries.
            </p>
            <div className="mt-6">
              <Label htmlFor="audience">Audience</Label>
              <Textarea
                id="audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g. Prospective enterprise buyers evaluating our platform"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="font-display text-3xl">Pick a visual style</h1>
            <p className="mt-2 text-sm text-ink-soft">You can change any of this later in the editor.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={style === s.id}
                  onClick={() => setStyle(s.id)}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors",
                    style === s.id ? "border-accent bg-accent-soft/60" : "border-line hover:border-ink",
                  )}
                >
                  <span className="font-medium">{s.label}</span>
                  <span className="mt-1 block text-xs text-ink-soft">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="font-display text-3xl">Do you have content already?</h1>
            <p className="mt-2 text-sm text-ink-soft">This changes where we send you next.</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                aria-pressed={hasContent === true}
                onClick={() => setHasContent(true)}
                className={cn(
                  "flex-1 rounded-lg border p-4 text-left",
                  hasContent === true ? "border-accent bg-accent-soft/60" : "border-line hover:border-ink",
                )}
              >
                <span className="font-medium">Yes, I have content</span>
                <span className="mt-1 block text-xs text-ink-soft">Paste text, upload a document or add a URL.</span>
              </button>
              <button
                type="button"
                aria-pressed={hasContent === false}
                onClick={() => setHasContent(false)}
                className={cn(
                  "flex-1 rounded-lg border p-4 text-left",
                  hasContent === false ? "border-accent bg-accent-soft/60" : "border-line hover:border-ink",
                )}
              >
                <span className="font-medium">No, start fresh</span>
                <span className="mt-1 block text-xs text-ink-soft">Describe an idea or pick a template.</span>
              </button>
            </div>

            <h2 className="mt-8 font-display text-xl">Choose a starting point</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Button variant="secondary" onClick={() => finish("generate")} disabled={saving}>
                Generate from a description
              </Button>
              <Button variant="secondary" onClick={() => finish("import")} disabled={saving}>
                Transform existing content
              </Button>
              <Button variant="secondary" onClick={() => finish("template")} disabled={saving}>
                Start from a template
              </Button>
              <Button variant="ghost" onClick={() => finish("blank")} disabled={saving}>
                Start with a blank canvas
              </Button>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-danger" role="alert">{error}</p>}

        {step < 3 && (
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => (step === 0 ? router.push("/dashboard") : setStep((s) => (s - 1) as Step))}
            >
              {step === 0 ? "Skip for now" : "Back"}
            </Button>
            <Button onClick={next} loading={saving}>
              Continue
            </Button>
          </div>
        )}
      </Card>

      <p className="mt-4 text-center text-xs text-ink-faint">
        Progress is saved as you go, so you can leave and return. Nothing here is required.
      </p>
    </div>
  );
}
