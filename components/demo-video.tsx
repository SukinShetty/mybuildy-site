"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { useState } from "react";

// Read at build time. Empty until the demo is published.
const VIDEO_ID = (process.env.NEXT_PUBLIC_DEMO_VIDEO_ID ?? "").trim();

/** Lite embed: poster and play button; the YouTube iframe loads only after a click. */
export function DemoVideo() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative mt-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-10 -inset-y-16 -z-10"
        style={{ background: "radial-gradient(50% 50% at 50% 50%, rgb(252 132 0 / 0.10), transparent)" }}
      />
      <div className="relative aspect-video overflow-hidden rounded-3xl border border-line bg-surface">
        {playing && VIDEO_ID ? (
          <iframe
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(VIDEO_ID)}?rel=0&modestbranding=1`}
            title="MyBuildy demo video"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <>
            <Image
              src="/images/demo-poster.jpg"
              alt="MyBuildy beside its guidance panel, which explains the last step and suggests the next prompt"
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-ink/30">
              {VIDEO_ID ? (
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  className="group flex items-center gap-3 rounded-full bg-orange py-3 pl-3 pr-6 text-body font-bold text-ink transition-colors hover:bg-amber"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-ink/15">
                    <Play className="size-5 fill-current" aria-hidden="true" />
                  </span>
                  Play the demo
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex cursor-not-allowed items-center gap-3 rounded-full border border-line bg-surface/90 py-3 pl-3 pr-6 text-body font-bold text-text"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-text/10">
                    <Play className="size-5 fill-current text-muted" aria-hidden="true" />
                  </span>
                  Demo video coming today
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
