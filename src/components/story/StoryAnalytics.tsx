"use client";

import { useEffect, useRef } from "react";

/**
 * Privacy-conscious, first-party story analytics.
 *
 * - A random per-visit id lives in sessionStorage, so it is discarded when the
 *   tab closes and never becomes a cross-site tracking cookie.
 * - Sections report their first meaningful visibility once; the collector also
 *   deduplicates (session, type, section) so repeated IntersectionObserver
 *   callbacks cannot inflate the numbers.
 * - Scroll depth is reported in 25% buckets.
 */
export function StoryAnalytics({ slug, sections }: { slug: string; sections: string[] }) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const key = "sw:visit";
    let sessionId = sessionStorage.getItem(key);
    if (!sessionId) {
      sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(key, sessionId);
    }

    const send = (type: string, extra: Record<string, unknown> = {}) => {
      const payload = JSON.stringify({ slug, sessionId, type, path: location.pathname, ...extra });
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/analytics/collect", new Blob([payload], { type: "application/json" }));
        } else {
          void fetch("/api/analytics/collect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          });
        }
      } catch {
        /* analytics must never break the page */
      }
    };

    send("page_view");

    let maxDepth = 0;
    let lastBucket = -1;
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const pct = max > 0 ? Math.round((el.scrollTop / max) * 100) : 100;
      if (pct > maxDepth) maxDepth = pct;
      const bucket = Math.floor(pct / 25) * 25;
      if (bucket >= 25 && bucket !== lastBucket) {
        lastBucket = bucket;
        send("scroll_depth", { value: bucket });
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const seen = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
          const id = (entry.target as HTMLElement).dataset.sectionId;
          if (!id || seen.has(id)) continue;
          seen.add(id);
          send("section_view", { sectionId: id });
        }
      },
      { threshold: [0.5] },
    );
    for (const id of sections) {
      const el = document.querySelector(`[data-section-id="${CSS.escape(id)}"]`);
      if (el) observer.observe(el);
    }

    const flushDepth = () => {
      if (maxDepth > 0 && lastBucket < 100) send("scroll_depth", { value: Math.min(100, maxDepth) });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushDepth();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushDepth);

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushDepth);
      observer.disconnect();
      flushDepth();
    };
  }, [slug, sections]);

  return null;
}
