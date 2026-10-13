import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/overlays";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Scrollwright — Turn ideas into immersive scrolling stories",
    template: "%s · Scrollwright",
  },
  description:
    "Scrollwright turns documents, links and rough ideas into immersive, scroll-driven web stories. Write, refine and publish cinematic narratives without writing code.",
  applicationName: "Scrollwright",
  openGraph: {
    type: "website",
    siteName: "Scrollwright",
    title: "Scrollwright — Immersive scrolling stories",
    description:
      "Turn ideas, documents and URLs into interactive, scroll-driven websites. No code required.",
    url: appUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Scrollwright — Immersive scrolling stories",
    description: "Turn ideas into immersive scroll-driven web stories. No code required.",
  },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#f7f4ef",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-screen bg-paper text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
