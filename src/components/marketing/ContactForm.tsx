"use client";

import { useState } from "react";
import { Button, Input, Label, Textarea, FieldError, Alert } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/overlays";

type Errors = Partial<Record<"name" | "email" | "message", string>>;

export function ContactForm() {
  const toast = useToast();
  const [values, setValues] = useState({ name: "", email: "", message: "", company: "", consent: false });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "unavailable">("idle");

  function validate(): boolean {
    const next: Errors = {};
    if (!values.name.trim()) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = "Enter a valid email address.";
    if (values.message.trim().length < 10) next.message = "Please add a little more detail.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.status === 503) {
        setStatus("unavailable");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not send your message.");
      }
      setStatus("sent");
      toast.push({ title: "Message received", tone: "success" });
      setValues({ name: "", email: "", message: "", company: "", consent: false });
    } catch (error) {
      setStatus("idle");
      toast.push({ title: "Could not send", description: (error as Error).message, tone: "error" });
    }
  }

  if (status === "sent") {
    return (
      <Alert tone="success" title="Thanks — we've got your message">
        We&apos;ll reply to your email as soon as we can. If this is urgent, mention it in your subject line.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {status === "unavailable" && (
        <Alert tone="warning" title="Message delivery is not configured in this environment">
          No contact-delivery provider is connected, so this form cannot send email here. The form itself is
          fully wired — configure a mail provider to enable it. Nothing was silently discarded.
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="contact-name">Name</Label>
          <Input
            id="contact-name"
            value={values.name}
            invalid={Boolean(errors.name)}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
          />
          <span id="contact-name-error">
            <FieldError>{errors.name}</FieldError>
          </span>
        </div>
        <div>
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            value={values.email}
            invalid={Boolean(errors.email)}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
          />
          <span id="contact-email-error">
            <FieldError>{errors.email}</FieldError>
          </span>
        </div>
      </div>
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="contact-company">Company</label>
        <input
          id="contact-company"
          tabIndex={-1}
          autoComplete="off"
          value={values.company}
          onChange={(e) => setValues({ ...values, company: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          rows={6}
          value={values.message}
          invalid={Boolean(errors.message)}
          onChange={(e) => setValues({ ...values, message: e.target.value })}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
        />
        <span id="contact-message-error">
          <FieldError>{errors.message}</FieldError>
        </span>
      </div>
      <label className="flex items-start gap-3 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={values.consent}
          onChange={(e) => setValues({ ...values, consent: e.target.checked })}
          className="mt-1"
        />
        I agree that Scrollwright may store this message to respond to my enquiry.
      </label>
      <Button type="submit" loading={status === "sending"} disabled={!values.consent}>
        Send message
      </Button>
    </form>
  );
}
