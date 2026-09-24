"use client";

import { useEffect, useRef } from "react";

/**
 * Pauses every CSS animation inside while the element is off screen: it renders with
 * `data-paused` (see `.bs[data-paused]` in globals.css) and an IntersectionObserver removes the
 * attribute while any part of it is visible. Children stay server-rendered; this adds only the
 * observer to the bundle.
 */
export function PlayWhenVisible({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) el.removeAttribute("data-paused");
      else el.setAttribute("data-paused", "");
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-paused="" role="img" aria-label={label} className={className}>
      {children}
    </div>
  );
}
