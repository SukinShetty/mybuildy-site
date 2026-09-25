"use client";

import { useRef, useState } from "react";
import { DownloadButtons } from "@/components/download-buttons";
import { HeroRobot } from "@/components/hero-robot";
import type { Downloads } from "@/lib/github";

export function Hero({ downloads }: { downloads: Downloads }) {
  const [attention, setAttention] = useState<HTMLElement | null>(null);
  const spot = useRef<HTMLDivElement>(null);

  // Spotlight follows the cursor across the hero. Plain CSS, updated without re-rendering.
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse" || !spot.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    spot.current.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px) translate(-50%, -50%)`;
    spot.current.style.opacity = "1";
  };
  const onPointerLeave = () => {
    if (spot.current) spot.current.style.opacity = "0";
  };

  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative isolate flex min-h-svh items-center overflow-hidden pb-16 pt-20 lg:pt-16"
    >
      <div
        ref={spot}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 -z-10 size-[640px] rounded-full opacity-0 blur-3xl transition-opacity duration-500"
        style={{ background: "radial-gradient(closest-side, rgb(252 132 0 / 0.14), transparent)" }}
      />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:px-8">
        <div className="order-2 lg:order-1">
          <h1 id="hero-title" className="max-w-[13ch] text-hero font-bold tracking-[-0.03em] text-balance">
            Your AI coding agent, finally explained.
          </h1>
          <p className="mt-7 max-w-[34rem] text-body text-text/85">
            MyBuildy sits beside your AI coding agent’s window, watches what it just did, and tells you in plain
            English what happened and what to type next.
          </p>
          <p className="mt-3 max-w-[34rem] text-body text-text">Free, open source, and it runs on your own computer.</p>

          <DownloadButtons
            downloads={downloads}
            onAttention={setAttention}
            note="Windows and macOS will warn you on first run — the installers aren't signed yet. We'll show you what to click."
            className="mt-9"
          />

          <p className="mt-5 text-small text-muted">
            Free forever · Windows 10 and 11 · macOS 14 and later · You bring your own AI key
          </p>
        </div>

        <div className="order-1 mx-auto -mb-[14%] -mt-[6%] w-[min(68vw,300px)] sm:w-[340px] lg:order-2 lg:-my-[4%] lg:w-full lg:max-w-[520px]">
          <HeroRobot attention={attention} />
        </div>
      </div>
    </section>
  );
}
