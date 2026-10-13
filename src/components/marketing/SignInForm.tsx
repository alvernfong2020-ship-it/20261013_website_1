"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Label, FieldError, Alert } from "@/components/ui/primitives";
import { Logo } from "@/components/ui/primitives";

export function SignInForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof fieldErrors = {};
    if (!email) next.email = "Enter your email.";
    if (!password) next.password = "Enter your password.";
    setFieldErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    setError(null);
    const result = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    setLoading(false);

    if (result?.error) {
      setError("That email and password combination did not match. Please try again.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <Link href="/" className="mb-8 inline-block">
        <Logo />
      </Link>
      <h1 className="text-display text-3xl">Welcome back</h1>
      <p className="mt-2 text-sm text-ink-soft">Sign in to your studio to continue writing.</p>

      {error && (
        <div className="mt-6">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            invalid={Boolean(fieldErrors.email)}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FieldError>{fieldErrors.email}</FieldError>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="mb-1.5 text-xs text-accent underline underline-offset-2">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            invalid={Boolean(fieldErrors.password)}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FieldError>{fieldErrors.password}</FieldError>
        </div>
        <Button type="submit" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>

      {googleEnabled && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-ink-faint">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
          <Button variant="secondary" className="w-full" onClick={() => signIn("google", { callbackUrl })}>
            Continue with Google
          </Button>
        </>
      )}

      <p className="mt-8 text-sm text-ink-soft">
        New here?{" "}
        <Link href="/sign-up" className="text-accent underline underline-offset-2">
          Create an account
        </Link>
      </p>

      <div className="mt-8 rounded-lg border border-line bg-paper-sunken/60 p-3 text-xs text-ink-faint">
        Trying the demo? Use <span className="font-medium text-ink-soft">demo@scrollwright.example</span> with
        password <span className="font-medium text-ink-soft">demo-password-123</span>.
      </div>
    </div>
  );
}
