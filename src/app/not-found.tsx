import Link from "next/link";
import { Logo, ButtonLink } from "@/components/ui/primitives";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md text-center">
        <Logo className="justify-center" />
        <p className="eyebrow mt-8">Error 404</p>
        <h1 className="mt-2 font-display text-4xl">We couldn&apos;t find that page</h1>
        <p className="mt-3 text-sm text-ink-soft">
          The link may be broken or the story may have been unpublished. Try the homepage, or browse examples to
          find something to read.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/">Go home</ButtonLink>
          <ButtonLink href="/examples" variant="secondary">
            Browse examples
          </ButtonLink>
        </div>
        <p className="mt-6 text-xs text-ink-faint">
          If you followed a link to a published story,{" "}
          <Link href="/contact" className="underline underline-offset-2">
            let us know
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
