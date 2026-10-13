/**
 * Minimal next/navigation test double.
 *
 * The real module relies on Next's app-router runtime, which is not present in
 * a plain vitest/jsdom environment. Components under test only ever read the
 * current path and push routes, so this stub is sufficient and keeps the tests
 * focused on real component behaviour.
 */
export function usePathname(): string {
  return "/";
}

export function useRouter() {
  return {
    push: () => {},
    replace: () => {},
    refresh: () => {},
    back: () => {},
    forward: () => {},
    prefetch: () => {},
  };
}

export function useSearchParams() {
  return new URLSearchParams();
}

export function useParams() {
  return {};
}
