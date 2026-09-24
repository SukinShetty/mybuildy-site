"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FEATURES } from "@/lib/features";

/**
 * Static stand-in with the same footprint as the card stack: the first card, the dot row, and
 * every feature as text. Server-rendered, so the content is there before (and without) JavaScript.
 */
function StackPlaceholder() {
  const f = FEATURES[0];
  return (
    <div className="mt-12">
      <div className="relative mx-auto h-[500px] max-w-5xl">
        <div className="absolute left-1/2 top-0 -ml-[min(170px,43vw)] flex h-[480px] w-[min(340px,86vw)] flex-col overflow-hidden rounded-3xl border border-line bg-surface">
          <div
            className="relative flex-1 overflow-hidden"
            style={{ background: "radial-gradient(70% 70% at 50% 55%, rgb(252 132 0 / 0.16), transparent)" }}
          >
            <Image src={f.image.src} alt={f.image.alt} fill sizes="340px" className="object-cover object-top px-6 pt-6" />
          </div>
          <div className="border-t border-line p-6">
            <p className="text-body font-bold">{f.title}</p>
            <p className="mt-1.5 text-small text-muted">{f.line}</p>
          </div>
        </div>
      </div>
      <div className="mt-6 h-11" aria-hidden="true" />
      <ul className="sr-only">
        {FEATURES.map((x) => (
          <li key={x.title}>
            {x.title}. {x.line}
          </li>
        ))}
      </ul>
    </div>
  );
}

// The stack needs framer-motion (drag, springs). Fetch it only as the section approaches.
const FeatureStack = dynamic(() => import("@/components/feature-stack"), {
  ssr: false,
  loading: () => <StackPlaceholder />,
});

export function Features() {
  const [near, setNear] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return <div ref={root}>{near ? <FeatureStack /> : <StackPlaceholder />}</div>;
}
