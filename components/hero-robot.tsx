"use client";

/**
 * The interactive hero robot, built from layered 2D art:
 *   glow (back) · reflection (floor) · robot = face-blank body + two pupils clipped to the visor.
 *
 * Self-contained on purpose: the only input is `attention`, an element to look at (the hovered
 * download button). Swap this file for a real 3D model later without touching anything else.
 *
 * Every animated value is a framer-motion motion value bound through `style`, so pointer
 * movement never re-renders React: the component renders once. The pointer only ever SETS
 * raw targets (once per frame at most); springs follow those targets, and every output is
 * clamped by useTransform, so the tilt and the pupils can never leave their limits even if a
 * spring were to misbehave. (The previous version relaunched `animate()` on every frame; each
 * relaunch inherited a runaway velocity, the springs diverged, and the robot swung edge-on
 * and off screen.)
 *
 * Tracking runs only on devices with a fine, hovering pointer and no reduced-motion
 * preference. Everyone else gets the CSS idle life (breathing, float, glow pulse); with
 * reduced motion only the breathing stays (see globals.css).
 *
 * Geometry is in source pixels of buildy-face-blank.png (512x768), measured by
 * scripts/make-face-assets.mjs, and placed in percentages so it scales with the image:
 *   visor bounds  x 170–343, y 190–291
 *   left eye      centre (210.5, 238),   r 26.5
 *   right eye     centre (303.5, 237.5), r 26
 *   pupil.png     56x56, one eye (ring + highlights) on the visor colour
 */

import Image from "next/image";
import { useEffect, useRef } from "react";
import { LazyMotion, domMin, m, useMotionValue, useSpring, useTransform } from "framer-motion";

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

// Limits. Pupils travel inside an ellipse that keeps the ring in the visor.
const TILT_Y_DEG = 12; // horizontal (turning left/right)
const TILT_X_DEG = 8; // vertical (nodding)
// Rotation alone barely reads on flat front-facing art; moving the body toward the pointer is
// what reads as "turning to look". Same springs as the tilt, clamped.
const SHIFT_X_PX = 18;
const SHIFT_Y_PX = 10; // total vertical travel, including the lift toward a hovered button
const LOOK_RX = 9; // source px
const LOOK_RY = 6;
// Pointer distance (screen px) at which the pupils reach the edge of their ellipse.
const LOOK_REACH = 260;

// Springs, all at or above critical damping so they settle without overshoot. The head is soft
// and slow, the pupils quick, so he visibly looks before he turns.
const HEAD_SPRING = { stiffness: 70, damping: 20, mass: 0.8 };
const EYE_SPRING = { stiffness: 300, damping: 34, mass: 0.5 };
const LIFT_SPRING = { stiffness: 220, damping: 30, mass: 1 };

const TRACK_QUERY = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
/** Scale (x, y) back onto the look ellipse if it lies outside it. */
const onEllipse = (x: number, y: number): [number, number] => {
  const k = Math.hypot(x / LOOK_RX, y / LOOK_RY);
  return k > 1 ? [x / k, y / k] : [x, y];
};

export function HeroRobot({ attention, className }: { attention?: HTMLElement | null; className?: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const attentionRef = useRef<HTMLElement | null>(null);
  const aimRef = useRef<() => void>(() => {});

  // Raw targets, written by the pointer (at most once per frame): head -1..1, eyes and lift in px.
  const headTargetX = useMotionValue(0);
  const headTargetY = useMotionValue(0);
  const eyeTargetX = useMotionValue(0);
  const eyeTargetY = useMotionValue(0);
  const liftTarget = useMotionValue(0);

  // Springs follow the targets.
  const headX = useSpring(headTargetX, HEAD_SPRING);
  const headY = useSpring(headTargetY, HEAD_SPRING);
  const eyeX = useSpring(eyeTargetX, EYE_SPRING);
  const eyeY = useSpring(eyeTargetY, EYE_SPRING);
  const lift = useSpring(liftTarget, LIFT_SPRING);

  // Clamped outputs. The robot turns AND shifts toward the pointer; the glow drifts the same way
  // at half the distance (depth); the floor reflection takes exactly the robot's horizontal shift,
  // so it can never decouple from his feet.
  const clampOpts = { clamp: true };
  const clampShiftY = (v: number) => Math.max(-SHIFT_Y_PX, Math.min(SHIFT_Y_PX, v));
  const rotateY = useTransform(headX, [-1, 1], [-TILT_Y_DEG, TILT_Y_DEG], clampOpts);
  const rotateX = useTransform(headY, [-1, 1], [TILT_X_DEG, -TILT_X_DEG], clampOpts);
  const robotX = useTransform(headX, [-1, 1], [-SHIFT_X_PX, SHIFT_X_PX], clampOpts);
  const robotY = useTransform([headY, lift], ([y, l]: number[]) => clampShiftY(clamp1(y) * SHIFT_Y_PX + l));
  const glowX = useTransform(robotX, (v) => v / 2);
  const glowY = useTransform(headY, [-1, 1], [-SHIFT_Y_PX / 2, SHIFT_Y_PX / 2], clampOpts);
  const reflX = robotX;
  const pupilX = useTransform([eyeX, eyeY], ([x, y]: number[]) => `${(onEllipse(x, y)[0] / PUPIL) * 100}%`);
  const pupilY = useTransform([eyeX, eyeY], ([x, y]: number[]) => `${(onEllipse(x, y)[1] / PUPIL) * 100}%`);

  useEffect(() => {
    const el = stage.current;
    const section: HTMLElement | Window = el?.closest("section") ?? window;
    const mq = window.matchMedia(TRACK_QUERY);
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;

    const toRest = () => {
      headTargetX.set(0);
      headTargetY.set(0);
      eyeTargetX.set(0);
      eyeTargetY.set(0);
      liftTarget.set(0);
    };

    // Recompute every target from the latest pointer (or the hovered button). Only SETS targets.
    const aim = () => {
      frame = 0;
      if (!el) return;
      const focus = attentionRef.current;
      let target = pointer;
      if (focus) {
        const b = focus.getBoundingClientRect();
        target = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      }
      liftTarget.set(focus ? -8 : 0);
      if (!target) {
        headTargetX.set(0);
        headTargetY.set(0);
        eyeTargetX.set(0);
        eyeTargetY.set(0);
        return;
      }
      const r = el.getBoundingClientRect();
      // Head: relative to the robot's centre, scaled by the viewport.
      headTargetX.set(clamp1((target.x - (r.left + r.width / 2)) / (window.innerWidth / 2)));
      headTargetY.set(clamp1((target.y - (r.top + r.height * 0.4)) / (window.innerHeight / 2)));
      // Pupils: direction from the midpoint between the eyes, magnitude easing in with distance.
      const scale = r.width / SRC_W;
      const dx = target.x - (r.left + ((EYES[0].cx + EYES[1].cx) / 2) * scale);
      const dy = target.y - (r.top + ((EYES[0].cy + EYES[1].cy) / 2) * scale);
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, dist / LOOK_REACH);
      const [lx, ly] = onEllipse((dx / dist) * LOOK_RX * reach, (dy / dist) * LOOK_RY * reach);
      eyeTargetX.set(lx);
      eyeTargetY.set(ly);
    };
    const scheduleAim = () => {
      if (!frame) frame = requestAnimationFrame(aim);
    };

    const onMove = (e: Event) => {
      const p = e as PointerEvent;
      if (p.pointerType !== "mouse" && p.pointerType !== "pen") return;
      pointer = { x: p.clientX, y: p.clientY };
      scheduleAim();
    };
    const onLeave = () => {
      pointer = null;
      scheduleAim();
    };

    let tracking = false;
    const attach = () => {
      if (tracking) return;
      tracking = true;
      section.addEventListener("pointermove", onMove, { passive: true });
      section.addEventListener("pointerleave", onLeave, { passive: true });
      window.addEventListener("scroll", scheduleAim, { passive: true });
      aimRef.current = scheduleAim;
    };
    const detach = () => {
      if (!tracking) return;
      tracking = false;
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", scheduleAim);
      aimRef.current = () => {};
      cancelAnimationFrame(frame);
      frame = 0;
      pointer = null;
      toRest();
    };
    const sync = () => (mq.matches ? attach() : detach());

    sync();
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      detach();
    };
  }, [headTargetX, headTargetY, eyeTargetX, eyeTargetY, liftTarget]);

  // Looking at a hovered download button, and lifting a few pixels toward it.
  useEffect(() => {
    attentionRef.current = attention ?? null;
    aimRef.current();
  }, [attention]);

  return (
    <LazyMotion features={domMin} strict>
      <div
        ref={stage}
        className={`relative aspect-[512/768] w-full select-none [perspective:1200px] ${className ?? ""}`}
        aria-hidden="true"
      >
        {/* Layer 1: radial glow behind him, pulsing out of phase with the breathing */}
        <m.div className="pointer-events-none absolute inset-0 will-change-transform" style={{ x: glowX, y: glowY }}>
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
        </m.div>

        {/* Layer 2: soft reflection beneath */}
        <m.div
          className="pointer-events-none absolute inset-x-0 top-[77%] h-[30%] will-change-transform"
          style={{ x: reflX }}
        >
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
        </m.div>

        {/* Layer 3: the robot. Only this wrapper is transformed; the images sit inside it. */}
        <m.div
          className="absolute inset-0 will-change-transform"
          style={{ x: robotX, y: robotY, rotateX, rotateY }}
        >
          <div className="absolute inset-0" style={{ animation: "buildy-float 6s ease-in-out infinite" }}>
            <div
              data-breathe=""
              className="absolute inset-0 origin-[50%_78%]"
              style={{ animation: "buildy-breathe 4s ease-in-out infinite" }}
            >
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
                  <m.div
                    key={i}
                    className="absolute will-change-transform"
                    style={{
                      left: pct(eye.cx - PUPIL / 2 - VISOR.x0, VW),
                      top: pct(eye.cy - PUPIL / 2 - VISOR.y0, VH),
                      width: pct(PUPIL, VW),
                      height: pct(PUPIL, VH),
                      x: pupilX,
                      y: pupilY,
                    }}
                  >
                    <Image src="/images/pupil.png" alt="" fill sizes="64px" className="object-contain" />
                  </m.div>
                ))}
              </div>
            </div>
          </div>
        </m.div>
      </div>
    </LazyMotion>
  );
}
