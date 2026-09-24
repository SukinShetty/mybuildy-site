"use client";

import { useEffect } from "react";

/**
 * The one scroll reveal used on the page: 24px up, fade, 500ms, once, never replayed.
 * Styles live in globals.css (`.js [data-reveal]`), so without JavaScript everything is visible,
 * and under prefers-reduced-motion reveals are instant.
 */
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div data-reveal="" className={className}>
      {children}
    </div>
  );
}

/** Mount once per page: marks each [data-reveal] as revealed the first time a quarter of it is on screen. */
export function RevealObserver() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-revealed", "");
          io.unobserve(e.target);
        }
      },
      { threshold: 0.25 },
    );
    document.querySelectorAll("[data-reveal]:not([data-revealed])").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
