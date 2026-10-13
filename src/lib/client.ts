"use client";

/** Tiny typed fetch helper for the studio UI. Throws ApiError on failure. */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public payload?: unknown,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, headers, ...rest } = init ?? {};
  const res = await fetch(path, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      (body as { error?: string })?.error || `Request failed with ${res.status}`,
      (body as { code?: string })?.code,
      body,
    );
  }
  return body as T;
}
