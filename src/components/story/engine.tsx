"use client";

import React, { useEffect, useRef, useState } from "react";
import type { AnimationConfig } from "@/lib/story/schema";

/* =========================================================================
   Scrollytelling engine primitives
   -------------------------------------------------------------------------
   - In-view animations use IntersectionObserver and run once.
   - Scroll-linked animations are driven by a single shared rAF loop that reads
     scroll position, so they never conflict with native scrolling.
   - Everything degrades gracefully: with prefers-reduced-motion or without
     JS, content is rendered visible and static. We never hide content behind
     an animation that might not run.
   ========================================================================= */

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/** Observes an element and reports when it first enters the viewport. */
export function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true); // fail open: show content if observer unsupported
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15, ...options },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return { ref, inView };
}

/** Reports scroll progress (0..1) of an element as it crosses the viewport. */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(0.5);
      return;
    }
    let raf = 0;
    let visible = true;

    const update = () => {
      raf = 0;
      if (!visible) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 when the element top is at the viewport bottom; 1 when its bottom passes the top.
      const total = rect.height + vh;
      const scrolled = vh - rect.top;
      const p = Math.min(1, Math.max(0, scrolled / total));
      setProgress(p);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    // Pause work while off-screen.
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible) onScroll();
      },
      { rootMargin: "20% 0px 20% 0px" },
    );
    io.observe(el);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return { ref, progress };
}

const PRESET_CLASS: Record<string, string> = {
  none: "",
  "fade-in": "opacity-0",
  "slide-up": "opacity-0 translate-y-8",
  "slide-left": "opacity-0 translate-x-8",
  "slide-right": "opacity-0 -translate-x-8",
  "scale-in": "opacity-0 scale-[0.96]",
  "mask-reveal": "opacity-0 [clip-path:inset(0_0_100%_0)]",
  crossfade: "opacity-0",
  stagger: "opacity-0 translate-y-4",
  parallax: "",
  "sticky-pin": "",
};

/**
 * Reveal — wraps content for in-view animations.
 *
 * If `preset` is "parallax" or "sticky-pin" the wrapper is a no-op; those are
 * handled by `Parallax` and `StickyChapter` which need scroll position.
 */
export function Reveal({
  animation,
  children,
  className,
  as: Tag = "div",
}: {
  animation: AnimationConfig;
  children: React.ReactNode;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}) {
  const reduced = usePrefersReducedMotion();
  const scrollLinked = animation.mode === "scroll-linked";
  const { ref, inView } = useInView<HTMLDivElement>();
  const { ref: scrollRef, progress } = useScrollProgress<HTMLDivElement>();

  if (reduced || animation.preset === "none" || animation.preset === "sticky-pin") {
    const Comp = Tag as React.ElementType;
    return <Comp className={className}>{children}</Comp>;
  }

  if (scrollLinked) {
    const transform =
      animation.preset === "parallax"
        ? `translate3d(0, ${(progress - 0.5) * animation.distance}px, 0)`
        : undefined;
    return (
      <div
        ref={scrollRef}
        className={className}
        style={{
          transform,
          opacity: animation.preset === "crossfade" ? Math.min(1, progress * 1.6) : undefined,
          willChange: transform ? "transform" : undefined,
        }}
      >
        {children}
      </div>
    );
  }

  if (animation.preset === "parallax") {
    return <div className={className}>{children}</div>;
  }

  const Comp = Tag as React.ElementType;
  return (
    <Comp
      ref={ref}
      className={
        className +
        " transition-[opacity,transform,clip-path] ease-out motion-reduce:transition-none " +
        (inView ? "" : PRESET_CLASS[animation.preset] ?? "opacity-0")
      }
      style={{
        transitionDuration: `${animation.duration}ms`,
        transitionDelay: `${animation.delay}ms`,
        ...(inView && animation.preset === "slide-up" ? { transform: `translateY(0)` } : {}),
      }}
    >
      {children}
    </Comp>
  );
}

/** Parallax backdrop — moves a background layer as the section scrolls. */
export function Parallax({
  children,
  distance = 60,
  className,
}: {
  children: React.ReactNode;
  distance?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <div ref={ref} className={className} aria-hidden={undefined}>
      <div
        style={{ transform: `translate3d(0, ${(progress - 0.5) * distance}px, 0)`, willChange: "transform" }}
        className="h-full w-full"
      >
        {children}
      </div>
    </div>
  );
}

/**
 * StickyChapter — pins a visual panel while narrative panels scroll past.
 * On mobile (and reduced motion) it falls back to a stacked layout so nothing
 * is trapped behind a scroll-jacked column.
 */
export function StickyChapter({
  panels,
  pinLength = 100,
}: {
  panels: { id: string; heading?: string; content?: string }[];
  pinLength?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) return;
      const p = Math.min(1, Math.max(0, -rect.top / total));
      setActive(Math.min(panels.length - 1, Math.floor(p * panels.length)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [panels.length, reduced]);

  if (reduced || panels.length === 0) {
    return (
      <div className="space-y-16">
        {panels.map((p) => (
          <div key={p.id} id={p.id}>
            {p.heading && <h3 className="font-display text-3xl">{p.heading}</h3>}
            {p.content && <p className="mt-3 text-ink-soft">{p.content}</p>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ height: `${panels.length * pinLength}vh` }} className="hidden md:block">
      <div className="sticky top-0 flex h-screen items-center">
        <div className="grid w-full grid-cols-2 gap-16">
          <div className="flex flex-col justify-center gap-8">
            {panels.map((p, i) => (
              <div
                key={p.id}
                id={p.id}
                className="transition-opacity duration-500"
                style={{ opacity: i === active ? 1 : 0.28 }}
              >
                {p.heading && <h3 className="font-display text-3xl">{p.heading}</h3>}
                {p.content && <p className="mt-3 max-w-md text-ink-soft">{p.content}</p>}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center">
            <div className="aspect-[3/4] w-full rounded-xl border border-line bg-paper-raised" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Per-story reading-progress indicator. */
export function ReadingProgress({ accent }: { accent?: string }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setPct(max > 0 ? (doc.scrollTop / max) * 100 : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div
      className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent"
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full transition-[width] duration-100"
        style={{ width: `${pct}%`, backgroundColor: accent || "var(--accent)" }}
      />
    </div>
  );
}

/** Small "scroll to explore" affordance used on hero sections. */
export function ScrollHint({ label = "Scroll to explore" }: { label?: string }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="flex flex-col items-center gap-2 text-ink-faint" aria-hidden="true">
      <span className="text-[0.7rem] font-medium uppercase tracking-[0.18em]">{label}</span>
      <span
        className={
          "h-8 w-px bg-line-strong " + (reduced ? "" : "animate-[scrollhint_1.8s_ease-in-out_infinite]")
        }
        style={{ transformOrigin: "top" }}
      />
      <style jsx>{`
        @keyframes scrollhint {
          0%, 100% { transform: scaleY(0.4); opacity: 0.4; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
