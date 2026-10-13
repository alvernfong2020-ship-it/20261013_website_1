"use client";

import { useEffect } from "react";
import { Button, ButtonLink, Logo } from "@/components/ui/primitives";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface to the console (and any configured client logger) — never the user.
    console.error("[app] unhandled error", error.digest, error.message);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md text-center">
        <Logo className="justify-center" />
        <p className="eyebrow mt-8">Error 500</p>
        <h1 className="mt-2 font-display text-4xl">Something went wrong</h1>
        <p className="mt-3 text-sm text-ink-soft">
          We hit an unexpected problem on our side. Your saved work is safe. Try again, and if it keeps happening,
          contact us with the reference below.
        </p>
        {error.digest && <p className="mt-3 font-mono text-xs text-ink-faint">ref: {error.digest}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/" variant="secondary">
            Go home
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
