"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input, Label, Alert } from "@/components/ui/primitives";
import { Logo } from "@/components/ui/primitives";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; devLink?: string | null } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json();
      setResult(body);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <Link href="/" className="mb-8 inline-block">
        <Logo />
      </Link>
      <h1 className="text-display text-3xl">Reset your password</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Enter the email on your account and we&apos;ll create a reset link.
      </p>

      {result ? (
        <div className="mt-6 space-y-4">
          <Alert tone="success">{result.message}</Alert>
          {result.devLink ? (
            <Alert tone="info" title="Development mode">
              No email provider is configured, so here is your reset link:{" "}
              <Link href={result.devLink} className="break-all text-accent underline underline-offset-2">
                {result.devLink}
              </Link>
            </Alert>
          ) : (
            <p className="text-sm text-ink-faint">
              Check your inbox. If nothing arrives within a few minutes, check your spam folder.
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            Send reset link
          </Button>
        </form>
      )}

      <p className="mt-8 text-sm text-ink-soft">
        <Link href="/sign-in" className="text-accent underline underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
