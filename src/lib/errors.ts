/**
 * Framework-agnostic HTTP error.
 *
 * Kept in its own module (with no auth/runtime imports) so that pure logic —
 * SSRF checks, AI source normalisation, story validation — can be unit-tested
 * without pulling in the Next.js auth runtime.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
