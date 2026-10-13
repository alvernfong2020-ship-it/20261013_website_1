"use client";

import React, { useState } from "react";

type Field = {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "select" | "checkbox";
  required?: boolean;
  options?: string[];
  placeholder?: string;
};

/**
 * Published-story form. Submits to the server, which re-validates, rate-limits
 * and applies spam checks. Never trusts client-side validation alone.
 */
export default function StoryForm({
  sectionId,
  fields,
  consentText,
  storySlug,
}: {
  sectionId: string;
  fields: Field[];
  consentText?: string;
  storySlug?: string;
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setStatus("submitting");
    setErrors({});
    setMessage("");

    try {
      const res = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, storySlug, data, renderedAt: form.dataset.renderedAt }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.issues) {
          setErrors(Object.fromEntries(json.issues.map((i: { path: string; message: string }) => [i.path, i.message])));
        }
        throw new Error(json.error || "Submission failed.");
      }
      setStatus("ok");
      setMessage("Thank you — your message was sent.");
      form.reset();
    } catch (err) {
      setStatus("error");
      setMessage((err as Error).message);
    }
  }

  if (status === "ok") {
    return (
      <div role="status" className="rounded-xl border border-success/30 bg-success/10 p-8 text-center">
        <p className="font-medium text-success">{message}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5"
      data-rendered-at={String(Date.now())}
      noValidate
    >
      {/* Honeypot: hidden from users, filled by naive bots */}
      <div className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
        <label>
          Leave this field empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={`${sectionId}-${f.name}`} className="mb-1.5 block text-sm font-medium">
            {f.label}
            {f.required && <span className="ml-1 text-accent" aria-hidden="true">*</span>}
          </label>
          {f.type === "textarea" ? (
            <textarea
              id={`${sectionId}-${f.name}`}
              name={f.name}
              required={f.required}
              placeholder={f.placeholder}
              rows={5}
              aria-invalid={!!errors[f.name]}
              aria-describedby={errors[f.name] ? `${sectionId}-${f.name}-error` : undefined}
              className="w-full rounded-lg border border-line bg-paper-raised px-4 py-3 outline-none focus:border-accent"
            />
          ) : f.type === "select" ? (
            <select
              id={`${sectionId}-${f.name}`}
              name={f.name}
              required={f.required}
              className="w-full rounded-lg border border-line bg-paper-raised px-4 py-3"
            >
              <option value="">Choose…</option>
              {(f.options || []).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : f.type === "checkbox" ? (
            <input id={`${sectionId}-${f.name}`} type="checkbox" name={f.name} required={f.required} className="h-5 w-5" />
          ) : (
            <input
              id={`${sectionId}-${f.name}`}
              type={f.type}
              name={f.name}
              required={f.required}
              placeholder={f.placeholder}
              aria-invalid={!!errors[f.name]}
              aria-describedby={errors[f.name] ? `${sectionId}-${f.name}-error` : undefined}
              className="w-full rounded-lg border border-line bg-paper-raised px-4 py-3 outline-none focus:border-accent"
            />
          )}
          {errors[f.name] && (
            <p id={`${sectionId}-${f.name}-error`} role="alert" className="mt-1.5 text-sm text-danger">
              {errors[f.name]}
            </p>
          )}
        </div>
      ))}

      {consentText && (
        <label className="flex items-start gap-3 text-sm text-ink-soft">
          <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4" />
          <span>{consentText}</span>
        </label>
      )}

      {status === "error" && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3 font-medium text-paper transition-colors hover:bg-accent-strong disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
