import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/editor", "/settings", "/analytics", "/assets", "/billing", "/preview", "/onboarding"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
