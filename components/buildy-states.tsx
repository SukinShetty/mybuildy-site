"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Buildy cycling through his real app states, played from the app's own frame-by-frame strips
 * (public/images/buildy/*.webp — one row of 256x288 frames each, lossless).
 *
 * 8 frames a second; review, working and waving play forwards then backwards (ping-pong), the rest
 * loop. Each state holds about 4 seconds, its glow and caption crossfading with it.
 *
 * Loading: nothing is fetched until the section scrolls into view. Then the first strip loads, and
 * each state loads the next one while it plays; if the next strip isn't ready yet, the current state
 * simply plays on. Paused while off screen. With reduced motion: the idle first frame and a static
 * caption, nothing else.
 */
const STATES = [
  { key: "idle", frames: 6, pingPong: false, caption: "Waiting for you", glow: "rgb(245 158 11 / 0.26)" },
  { key: "review", frames: 6, pingPong: true, caption: "Watching your coding agent work", glow: "rgb(16 185 129 / 0.26)" },
  { key: "working", frames: 6, pingPong: true, caption: "Thinking about what just happened", glow: "rgb(139 92 246 / 0.3)" },
  { key: "waving", frames: 4, pingPong: true, caption: "Your next prompt is ready", glow: "rgb(255 240 222 / 0.2)" },
  { key: "jumping", frames: 5, pingPong: false, caption: "It worked!", glow: "rgb(16 185 129 / 0.3)" },
  { key: "failed", frames: 8, pingPong: false, caption: "Something broke — and here’s why", glow: "rgb(239 68 68 / 0.28)" },
] as const;

const FPS = 8;
const TICKS_PER_STATE = 4 * FPS;
const stripUrl = (key: string) => `/images/buildy/${key}.webp`;

/** Frame shown on tick `tick` of a state: a plain loop, or 0→n-1→1 for ping-pong. */
function frameAt(frames: number, pingPong: boolean, tick: number): number {
  if (!pingPong) return tick % frames;
  const period = 2 * frames - 2;
  const t = tick % period;
  return t < frames ? t : period - t;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function BuildyStates({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [seen, setSeen] = useState(false); // has scrolled into view: start loading
  const [onScreen, setOnScreen] = useState(false);
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(new Set());
  const [state, setState] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      setOnScreen(e.isIntersecting);
      if (e.isIntersecting) setSeen(true);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Load the strip on screen now and, unless motion is reduced, the one after it.
  const wanted = reducedMotion ? [STATES[0].key] : [STATES[state].key, STATES[(state + 1) % STATES.length].key];
  const wantedKey = seen ? wanted.join(",") : "";
  useEffect(() => {
    if (!wantedKey) return;
    for (const key of wantedKey.split(",")) {
      if (loaded.has(key)) continue;
      const img = new Image();
      img.onload = () => setLoaded((prev) => new Set(prev).add(key));
      img.src = stripUrl(key);
    }
  }, [wantedKey, loaded]);

  const playing = onScreen && !reducedMotion && loaded.has(STATES[state].key);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000 / FPS);
    return () => window.clearInterval(id);
  }, [playing]);

  // Move to the next state after ~4 seconds, once its strip is ready.
  const nextKey = STATES[(state + 1) % STATES.length].key;
  useEffect(() => {
    if (tick >= TICKS_PER_STATE && loaded.has(nextKey)) {
      setState((s) => (s + 1) % STATES.length);
      setTick(0);
    }
  }, [tick, nextKey, loaded]);

  const shown = reducedMotion ? 0 : state;

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Buildy, a small orange robot, cycling through what he does: waiting for you, watching your coding agent work, thinking about what just happened, telling you your next prompt is ready, celebrating when it worked, and explaining when something broke"
      className={className}
    >
      <div aria-hidden="true" className="relative aspect-[256/288] w-full">
        {STATES.map((s, i) => (
          <div
            key={s.key}
            className="absolute inset-[4%] -z-10 rounded-full transition-opacity duration-500 ease-in-out"
            style={{
              background: `radial-gradient(closest-side, ${s.glow} 0%, transparent 100%)`,
              opacity: i === shown ? 1 : 0,
            }}
          />
        ))}
        {STATES.map((s, i) => {
          const frame = reducedMotion || i !== state ? 0 : frameAt(s.frames, s.pingPong, tick);
          return (
            <div
              key={s.key}
              data-state={s.key}
              className="absolute inset-0 bg-no-repeat transition-opacity duration-300 ease-in-out"
              style={{
                backgroundImage: loaded.has(s.key) ? `url(${stripUrl(s.key)})` : undefined,
                backgroundSize: `${s.frames * 100}% 100%`,
                backgroundPosition: `${(frame / (s.frames - 1)) * 100}% 0`,
                opacity: i === shown && loaded.has(s.key) ? 1 : 0,
              }}
            />
          );
        })}
      </div>

      {/* Caption, changing with the state */}
      <p aria-hidden="true" className="mt-4 grid text-center text-small text-muted">
        {STATES.map((s, i) => (
          <span
            key={s.key}
            className="transition-opacity duration-500 ease-in-out [grid-area:1/1]"
            style={{ opacity: i === shown ? 1 : 0 }}
          >
            {s.caption}
          </span>
        ))}
      </p>
    </div>
  );
}
