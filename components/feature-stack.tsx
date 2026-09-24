"use client";

/**
 * Fanned 3D card stack: spring transitions, drag/swipe on the active card, dots, keyboard arrows,
 * looping auto-advance that pauses on hover/focus and while off-screen. Below 640px only the
 * active card shows, as a single swipeable card. Plain anchors only, no next/link.
 */

import Image from "next/image";
import { motion, useInView, useReducedMotion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FEATURES } from "@/lib/features";
import { cn } from "@/lib/utils";

const N = FEATURES.length;
const AUTO_MS = 5000;

/** Signed distance from the active card, wrapped so the stack loops. Range [-N/2, N/2). */
const offsetOf = (i: number, active: number) => ((i - active + N + N / 2) % N) - N / 2;

export default function FeatureStack() {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { amount: 0.4 });
  const reduce = useReducedMotion();
  const paused = hovered || focused || !inView || Boolean(reduce);

  const go = useCallback((d: number) => setActive((a) => (a + d + N) % N), []);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => go(1), AUTO_MS);
    return () => clearTimeout(t);
  }, [paused, active, go]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const swipe = info.offset.x + info.velocity.x * 0.2;
    if (swipe < -70) go(1);
    else if (swipe > 70) go(-1);
  };

  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 260, damping: 30, mass: 0.9 };

  return (
    <div
      ref={root}
      role="region"
      aria-roledescription="carousel"
      aria-label="Features. Use the left and right arrow keys to move between cards."
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}
      className="mt-12 rounded-3xl"
    >
      <div className="relative mx-auto h-[500px] max-w-5xl [perspective:1400px]">
        {FEATURES.map((f, i) => {
          const o = offsetOf(i, active);
          const d = Math.abs(o);
          const isActive = o === 0;
          const hidden = d > 2;
          return (
            <motion.article
              key={f.title}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${N}: ${f.title}`}
              aria-hidden={!isActive}
              initial={false}
              animate={{
                x: `${o * 58}%`,
                rotateY: o * -14,
                rotateZ: o * 2.5,
                scale: 1 - d * 0.08,
                opacity: hidden ? 0 : 1,
                filter: `brightness(${1 - Math.min(d, 3) * 0.28})`,
              }}
              transition={spring}
              style={{ zIndex: 10 - d }}
              drag={isActive ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.55}
              dragSnapToOrigin
              onDragEnd={isActive ? onDragEnd : undefined}
              onClick={isActive ? undefined : () => setActive(i)}
              className={cn(
                "absolute left-1/2 top-0 -ml-[min(170px,43vw)] flex h-[480px] w-[min(340px,86vw)] origin-bottom flex-col overflow-hidden rounded-3xl border border-line bg-surface [transform-style:preserve-3d]",
                isActive ? "cursor-grab touch-pan-y active:cursor-grabbing" : "cursor-pointer",
                hidden && "pointer-events-none",
                !isActive && "max-sm:invisible",
              )}
            >
              <div
                className="relative flex-1 overflow-hidden"
                style={{ background: "radial-gradient(70% 70% at 50% 55%, rgb(252 132 0 / 0.16), transparent)" }}
              >
                <Image
                  src={f.image.src}
                  alt={f.image.alt}
                  fill
                  draggable={false}
                  sizes="340px"
                  className={cn(
                    "pointer-events-none select-none",
                    f.image.kind === "pose" ? "object-contain p-4" : "object-cover object-top px-6 pt-6 [border-radius:28px]",
                  )}
                />
              </div>
              <div className="border-t border-line p-6">
                <h3 className="text-body font-bold">{f.title}</h3>
                <p className="mt-1.5 text-small text-muted">{f.line}</p>
              </div>
            </motion.article>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous feature"
          className="flex size-11 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-orange/60 hover:text-text"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <div className="flex items-center">
          {FEATURES.map((f, i) => (
            <button
              key={f.title}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show feature ${i + 1}: ${f.title}`}
              aria-current={i === active ? "true" : undefined}
              className="group flex size-6 items-center justify-center"
            >
              <span
                className={cn(
                  "block h-2 rounded-full transition-all duration-300",
                  i === active ? "w-6 bg-orange" : "w-2 bg-text/25 group-hover:bg-text/50",
                )}
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next feature"
          className="flex size-11 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-orange/60 hover:text-text"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>
      <p className="sr-only" aria-live={paused ? "polite" : "off"} aria-atomic="true">
        {FEATURES[active].title}. {FEATURES[active].line}
      </p>
    </div>
  );
}
