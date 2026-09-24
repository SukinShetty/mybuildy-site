"use client";

/**
 * The interactive hero robot, built from layered 2D art:
 *   glow (back) · reflection (floor) · robot = face-blank body + two pupils clipped to the visor.
 *
 * Self-contained on purpose: the only input is `attention`, an element to look at (the hovered
 * download button). Swap this file for a real 3D model later without touching anything else.
 *
 * It renders as static markup with CSS idle life (breathing, float, glow pulse). Only on devices
 * that track (a fine pointer that can hover, and no reduced-motion preference) does it import
 * framer-motion and drive the tilt, parallax and pupils with springs. Phones never download it.
 *
 * Geometry is in source pixels of buildy-face-blank.png (512x768), measured by
 * scripts/make-face-assets.mjs:
 *   visor bounds  x 170–343, y 190–291
 *   left eye      centre (210.5, 238),   r 26.5
 *   right eye     centre (303.5, 237.5), r 26
 *   pupil.png     56x56, one eye (ring + highlights) on the visor colour
 */

import Image from "next/image";
import { useEffect, useRef } from "react";

const SRC_W = 512;
const SRC_H = 768;
const VISOR = { x0: 170, y0: 190, x1: 344, y1: 292 }; // exclusive right/bottom
const VW = VISOR.x1 - VISOR.x0;
const VH = VISOR.y1 - VISOR.y0;
const EYES = [
  { cx: 210.5, cy: 238 },
  { cx: 303.5, cy: 237.5 },
];
const PUPIL = 56;
// How far the pupils may travel from rest, in source px: an ellipse that keeps the ring inside the visor.
const LOOK_RX = 9;
const LOOK_RY = 6;
// Pointer distance (screen px) at which the pupils reach the edge of their ellipse.
const LOOK_REACH = 260;
// Springs: the head is soft and slow, the pupils quick, so he visibly looks before he turns.
const HEAD_SPRING = { type: "spring", stiffness: 90, damping: 18, mass: 0.8 } as const;
const EYE_SPRING = { type: "spring", stiffness: 420, damping: 32, mass: 0.5 } as const;
const LIFT_SPRING = { type: "spring", stiffness: 260, damping: 22 } as const;

const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

export function HeroRobot({ attention, className }: { attention?: HTMLElement | null; className?: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const refl = useRef<HTMLDivElement>(null);
  const robot = useRef<HTMLDivElement>(null);
  const pupils = useRef<(HTMLDivElement | null)[]>([]);
  const attentionRef = useRef<HTMLElement | null>(null);
  const aimRef = useRef<() => void>(() => {});

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let teardown: (() => void) | undefined;
    let cancelled = false;

    const start = async () => {
      const { motionValue, animate } = await import("framer-motion");
      if (cancelled || !stage.current) return;

      // Pointer relative to the robot (-1..1), pupil offset in source px, lift in px.
      const nx = motionValue(0), ny = motionValue(0);
      const px = motionValue(0), py = motionValue(0);
      const lift = motionValue(0);

      let frame = 0;
      const paint = () => {
        frame = 0;
        const x = nx.get(), y = ny.get();
        // Three parallax rates: glow least, reflection middle, robot most.
        if (glow.current) glow.current.style.transform = `translate3d(${x * -10}px, ${y * -8}px, 0)`;
        if (refl.current) refl.current.style.transform = `translate3d(${x * 10}px, 0, 0)`;
        if (robot.current)
          robot.current.style.transform = `translate3d(${x * 18}px, ${y * 10 + lift.get()}px, 0) rotateX(${y * -6}deg) rotateY(${x * 8}deg)`;
        const t = `translate(${(px.get() / PUPIL) * 100}%, ${(py.get() / PUPIL) * 100}%)`;
        for (const p of pupils.current) if (p) p.style.transform = t;
      };
      const schedulePaint = () => { if (!frame) frame = requestAnimationFrame(paint); };
      const unsubs = [nx, ny, px, py, lift].map((v) => v.on("change", schedulePaint));

      let pointer: { x: number; y: number } | null = null;
      const aim = () => {
        const el = stage.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        let target = pointer;
        const focus = attentionRef.current;
        if (focus) {
          const b = focus.getBoundingClientRect();
          target = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
        }
        animate(lift, focus ? -8 : 0, LIFT_SPRING);
        if (!target) {
          for (const v of [nx, ny]) animate(v, 0, HEAD_SPRING);
          for (const v of [px, py]) animate(v, 0, EYE_SPRING);
          return;
        }
        // Head tilt and parallax: relative to the robot's centre, scaled by the viewport.
        animate(nx, clamp1((target.x - (r.left + r.width / 2)) / (window.innerWidth / 2)), HEAD_SPRING);
        animate(ny, clamp1((target.y - (r.top + r.height * 0.4)) / (window.innerHeight / 2)), HEAD_SPRING);
        // Pupils: direction from the midpoint between the eyes, magnitude eases in with distance,
        // so the offset always lies inside the look ellipse.
        const scale = r.width / SRC_W;
        const dx = target.x - (r.left + ((EYES[0].cx + EYES[1].cx) / 2) * scale);
        const dy = target.y - (r.top + ((EYES[0].cy + EYES[1].cy) / 2) * scale);
        const dist = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, dist / LOOK_REACH);
        animate(px, (dx / dist) * LOOK_RX * reach, EYE_SPRING);
        animate(py, (dy / dist) * LOOK_RY * reach, EYE_SPRING);
      };

      let aimFrame = 0;
      const scheduleAim = () => { if (!aimFrame) aimFrame = requestAnimationFrame(() => { aimFrame = 0; aim(); }); };
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
        pointer = { x: e.clientX, y: e.clientY };
        scheduleAim();
      };
      const onLeave = () => { pointer = null; scheduleAim(); };

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("scroll", scheduleAim, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      aimRef.current = scheduleAim;

      teardown = () => {
        aimRef.current = () => {};
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("scroll", scheduleAim);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        cancelAnimationFrame(frame);
        cancelAnimationFrame(aimFrame);
        unsubs.forEach((u) => u());
        [nx, ny, px, py, lift].forEach((v) => v.destroy());
        for (const el of [glow.current, refl.current, robot.current, ...pupils.current]) if (el) el.style.transform = "";
      };
    };

    const sync = () => {
      teardown?.();
      teardown = undefined;
      if (mq.matches) start();
    };
    sync();
    mq.addEventListener("change", sync);
    return () => {
      cancelled = true;
      mq.removeEventListener("change", sync);
      teardown?.();
    };
  }, []);

  // Looking at a hovered download button, and lifting a few pixels toward it.
  useEffect(() => {
    attentionRef.current = attention ?? null;
    aimRef.current();
  }, [attention]);

  return (
    <div
      ref={stage}
      className={`relative aspect-[512/768] w-full select-none [perspective:1200px] ${className ?? ""}`}
      aria-hidden="true"
    >
      {/* Layer 1: radial glow behind him, pulsing out of phase with the breathing */}
      <div ref={glow} className="pointer-events-none absolute inset-0 will-change-transform">
        <div
          className="absolute left-1/2 top-[42%] aspect-square w-[118%] -translate-x-1/2 -translate-y-1/2"
          style={{ animation: "buildy-glow 4s ease-in-out -2s infinite" }}
        >
          <div
            className="h-full w-full rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgb(252 168 0 / 0.30), rgb(252 132 0 / 0.16) 38%, rgb(204 60 0 / 0.07) 62%, transparent 100%)",
            }}
          />
        </div>
      </div>

      {/* Layer 2: soft reflection beneath */}
      <div ref={refl} className="pointer-events-none absolute inset-x-0 top-[77%] h-[30%] will-change-transform">
        <div
          className="absolute left-1/2 top-[1%] h-[9%] w-[58%] -translate-x-1/2 rounded-[50%]"
          style={{
            background: "radial-gradient(closest-side, rgb(204 60 0 / 0.55), rgb(204 60 0 / 0.18) 55%, transparent)",
            animation: "buildy-shadow 4s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-full overflow-hidden opacity-[0.16]"
          style={{
            maskImage: "linear-gradient(to bottom, black, transparent 70%)",
            WebkitMaskImage: "linear-gradient(to bottom, black, transparent 70%)",
          }}
        >
          {/* feet sit 22% down the flipped art; margin % resolves against width, so 22% x 1.5 */}
          <div className="relative aspect-[512/768] w-full -scale-y-100" style={{ marginTop: "-33%" }}>
            <Image src="/images/buildy-face-blank.png" alt="" fill sizes="(max-width: 1024px) 70vw, 520px" className="object-contain blur-[1.5px]" />
          </div>
        </div>
      </div>

      {/* Layer 3: the robot */}
      <div ref={robot} className="absolute inset-0 will-change-transform [transform-style:preserve-3d]">
        <div className="absolute inset-0" style={{ animation: "buildy-float 6s ease-in-out infinite" }}>
          <div className="absolute inset-0 origin-[50%_78%]" style={{ animation: "buildy-breathe 4s ease-in-out infinite" }}>
            <Image
              src="/images/buildy-face-blank.png"
              alt=""
              fill
              priority
              fetchPriority="high"
              sizes="(max-width: 1024px) 70vw, 520px"
              className="object-contain"
            />
            {/* Visor: clips the pupils to the dark glass. Rounded like the art's visor. */}
            <div
              className="absolute overflow-hidden"
              style={{
                left: pct(VISOR.x0, SRC_W),
                top: pct(VISOR.y0, SRC_H),
                width: pct(VW, SRC_W),
                height: pct(VH, SRC_H),
                borderRadius: "34% / 48%",
              }}
            >
              {EYES.map((eye, i) => (
                <div
                  key={i}
                  ref={(el) => { pupils.current[i] = el; }}
                  className="absolute will-change-transform"
                  style={{
                    left: pct(eye.cx - PUPIL / 2 - VISOR.x0, VW),
                    top: pct(eye.cy - PUPIL / 2 - VISOR.y0, VH),
                    width: pct(PUPIL, VW),
                    height: pct(PUPIL, VH),
                  }}
                >
                  <Image src="/images/pupil.png" alt="" fill sizes="64px" className="object-contain" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
