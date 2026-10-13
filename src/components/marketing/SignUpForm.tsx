"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Label, FieldError, Alert } from "@/components/ui/primitives";
import { Logo } from "@/components/ui/primitives";

type Errors = Partial<Record<"name" | "email" | "password", string>>;

export function SignUpForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const template = params.get("template");
  const plan = params.get("plan");
  const cycle = params.get("cycle") || "monthly";

  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!values.name.trim()) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = "Enter a valid email address.";
    if (values.password.length < 8 || !/[A-Za-z]/.test(values.password) || !/[0-9]/.test(values.password))
      next.password = "At least 8 characters, including a letter and a number.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    setFormError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not create your account.");

      // Sign the new user straight in.
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      if (result?.error) throw new Error("Account created, but sign-in failed. Please sign in manually.");

      const next_qs = new URLSearchParams();
      if (template) next_qs.set("template", template);
      if (plan) {
        next_qs.set("plan", plan);
        next_qs.set("cycle", cycle);
      }
      router.push(`/onboarding${next_qs.toString() ? `?${next_qs}` : ""}`);
      router.refresh();
    } catch (error) {
      setFormError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <Link href="/" className="mb-8 inline-block">
        <Logo />
      </Link>
      <h1 className="text-display text-3xl">Create your studio</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Free to start. One workspace, one published story, and 20 AI credits a month.
      </p>

      {formError && (
        <div className="mt-6">
          <Alert tone="danger">{formError}</Alert>
        </div>
      )}
      {(template || plan) && (
        <div className="mt-6">
          <Alert tone="info">
            {template && <>Starting from the <strong>{template}</strong> template. </>}
            {plan && <>You selected the <strong>{plan}</strong> plan ({cycle}).</>}
          </Alert>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            value={values.name}
            invalid={Boolean(errors.name)}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
          />
          <FieldError>{errors.name}</FieldError>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={values.email}
            invalid={Boolean(errors.email)}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
          />
          <FieldError>{errors.email}</FieldError>
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            invalid={Boolean(errors.password)}
            onChange={(e) => setValues({ ...values, password: e.target.value })}
          />
          <FieldError>{errors.password}</FieldError>
        </div>
        <Button type="submit" className="w-full" loading={loading}>
          Create account
        </Button>
        <p className="text-xs text-ink-faint">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            privacy policy
          </Link>
          .
        </p>
      </form>

      {googleEnabled && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-ink-faint">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
          <Button variant="secondary" className="w-full" onClick={() => signIn("google", { callbackUrl: "/onboarding" })}>
            Continue with Google
          </Button>
        </>
      )}

      <p className="mt-8 text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-accent underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}
