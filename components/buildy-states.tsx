import Image from "next/image";
import { PlayWhenVisible } from "@/components/play-when-visible";

/**
 * Buildy cycling through his real app states, in pure CSS (globals.css, "Buildy states"):
 *   idle 2.5s → watching 4s → thinking 3s → speaking 4s → idle …
 * Each pose, its glow colour, its effect (thinking dots / speaking ripples) and its caption share
 * one keyframe track per state, so they crossfade together (400ms, small scale pop on the pose).
 * Breathing and float run underneath. No cursor tracking here: the hero is the page's one
 * interactive moment. Paused off screen; with reduced motion he stands still, watching.
 */
const STATES = [
  { key: "idle", src: "/images/buildy-idle.png", caption: "Waiting" },
  { key: "watching", src: "/images/buildy-watching.png", caption: "Watching your terminal" },
  { key: "thinking", src: "/images/buildy-thinking.png", caption: "Working out what happened" },
  { key: "speaking", src: "/images/buildy-speaking.png", caption: "Telling you what to do next" },
] as const;

export function BuildyStates({ className }: { className?: string }) {
  return (
    <PlayWhenVisible
      className={`bs ${className ?? ""}`}
      label="Buildy, a small orange robot, cycling through what he does: waiting, watching your terminal, working out what happened, and telling you what to do next"
    >
      <div aria-hidden="true" className="relative aspect-[512/768] w-full">
        {/* Glow per state, behind him */}
        {STATES.map((s) => (
          <div key={s.key} className={`bs-glow bs-${s.key} absolute inset-[6%] -z-10 rounded-full`} />
        ))}

        <div className="bs-float absolute inset-0">
          <div className="bs-breathe absolute inset-0 origin-[50%_78%]">
            {/* Speaking: soft ripples around his head */}
            <div className="bs-fx bs-speaking absolute left-1/2 top-[30%] aspect-square w-[62%] -translate-x-1/2 -translate-y-1/2">
              <span className="bs-ripple" />
              <span className="bs-ripple" style={{ animationDelay: "0.6s" }} />
              <span className="bs-ripple" style={{ animationDelay: "1.2s" }} />
            </div>

            {STATES.map((s) => (
              <div key={s.key} className={`bs-pose bs-${s.key} absolute inset-0`}>
                <Image src={s.src} alt="" fill sizes="(max-width: 1024px) 76vw, 440px" className="object-contain" />
              </div>
            ))}

            {/* Thinking: three dots orbiting above his head */}
            <div className="bs-fx bs-thinking absolute left-1/2 top-[3%] aspect-square w-[16%] -translate-x-1/2">
              <div className="bs-orbit absolute inset-0">
                <span className="bs-dot" style={{ transform: "rotate(0deg) translateX(34cqw)" }} />
                <span className="bs-dot" style={{ transform: "rotate(120deg) translateX(34cqw)" }} />
                <span className="bs-dot" style={{ transform: "rotate(240deg) translateX(34cqw)" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Caption, changing with the state */}
      <p aria-hidden="true" className="mt-4 grid text-center text-small text-muted">
        {STATES.map((s) => (
          <span key={s.key} className={`bs-caption bs-${s.key} [grid-area:1/1]`}>
            {s.caption}
          </span>
        ))}
      </p>
    </PlayWhenVisible>
  );
}
