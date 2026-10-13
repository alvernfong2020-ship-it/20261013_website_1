import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { getOptionalUser } from "@/lib/auth/authorize";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getOptionalUser().catch(() => null);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader signedIn={Boolean(user)} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
