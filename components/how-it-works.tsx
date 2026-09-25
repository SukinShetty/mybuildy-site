"use client";

import { useEffect, useRef } from "react";
import { Reveal } from "@/components/reveal";

const steps = [
  { title: "Tell Buildy what you are building", body: "One sentence: what you want, and what “done” looks like." },
  { title: "Point him at your coding agent", body: "Click the robot, pick the window your coding agent is running in." },
  {
    title: "Read what just happened",
    body: "Plain English every time the agent finishes a step, plus whether you are still on track.",
  },
  { title: "Paste the next prompt", body: "He writes it, you read it, one click pastes it into your coding agent’s window. You press Enter." },
];

export function HowItWorks() {
  const list = useRef<HTMLOListElement>(null);
  const line = useRef<HTMLDivElement>(null);

  // The line draws itself as the steps scroll past: from the list's top reaching 75% of the
  // viewport to its bottom reaching 55%. Only draws forward, so scrolling back never undraws it.
  useEffect(() => {
    let frame = 0;
    let drawn = 0;
    const update = () => {
      frame = 0;
      const el = list.current;
      if (!el || !line.current) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = r.top - vh * 0.75;
      const end = r.bottom - vh * 0.55;
      const p = Math.max(0, Math.min(1, -start / (end - start)));
      if (p > drawn) {
        drawn = p;
        line.current.style.transform = `scaleY(${p})`;
      }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <ol ref={list} className="relative mt-14 max-w-3xl">
      {/* track + drawn line, centred on the 48px step markers */}
      <div aria-hidden="true" className="absolute bottom-6 left-6 top-6 w-px -translate-x-1/2 bg-line" />
      <div
        ref={line}
        aria-hidden="true"
        data-draw-line=""
        className="absolute bottom-6 left-6 top-6 w-px origin-top -translate-x-1/2 bg-orange transition-transform duration-300 ease-out"
        style={{ transform: "scaleY(0)" }}
      />
      {steps.map((s, i) => (
        <li key={s.title} className="pb-14 last:pb-0">
          <Reveal className="relative pl-20">
            <span
              aria-hidden="true"
              className="absolute left-0 top-0 flex size-12 items-center justify-center rounded-full border border-orange/60 bg-ink text-body font-bold text-orange"
            >
              {i + 1}
            </span>
            <h3 className="pt-2 text-body font-bold">
              <span className="sr-only">Step {i + 1}: </span>
              {s.title}
            </h3>
            <p className="mt-2 text-body text-muted">{s.body}</p>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}
