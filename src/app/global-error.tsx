"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem", textAlign: "center" }}>
        <h1>Something went wrong</h1>
        <p>We hit an unexpected problem. Your saved work is safe.</p>
        {error.digest && <p style={{ color: "#8a8a8a", fontSize: "0.8rem" }}>ref: {error.digest}</p>}
        <button onClick={reset} style={{ marginTop: "1rem", padding: "0.6rem 1.2rem" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
