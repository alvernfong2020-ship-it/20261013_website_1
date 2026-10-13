"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Label, FieldError, Alert } from "@/components/ui/primitives";
import { Logo } from "@/components/ui/primitives";

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setFieldError("At least 8 characters, including a letter and a number.");
      return;
    }
    if (password !== confirm) {
      setFieldError("The two passwords do not match.");
      return;
    }
    setFieldError(null);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not reset your password.");
      setDone(true);
      setTimeout(() => router.push("/sign-in"), 1500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 inline-block">
          <Logo />
        </Link>
        <Alert tone="danger" title="Missing reset token">
          This link is incomplete. Request a new password reset link.
        </Alert>
        <p className="mt-6 text-sm">
          <Link href="/forgot-password" className="text-accent underline underline-offset-2">
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <Link href="/" className="mb-8 inline-block">
        <Logo />
      </Link>
      <h1 className="text-display text-3xl">Choose a new password</h1>

      {done ? (
        <div className="mt-6">
          <Alert tone="success" title="Password updated">
            Your password has been changed and existing sessions have been signed out. Redirecting you to
            sign in…
          </Alert>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <div>
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              invalid={Boolean(fieldError)}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              invalid={Boolean(fieldError)}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <FieldError>{fieldError}</FieldError>
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            Update password
          </Button>
        </form>
      )}
    </div>
  );
}
