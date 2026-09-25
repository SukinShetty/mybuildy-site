import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import { BuildyStates } from "@/components/buildy-states";
import { DemoVideo } from "@/components/demo-video";
import { DownloadButtons } from "@/components/download-buttons";
import { Features } from "@/components/features";
import { GitHubMark } from "@/components/github-mark";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { Reveal, RevealObserver } from "@/components/reveal";
import { TopBar } from "@/components/top-bar";
import { getDownloads, getStarCount } from "@/lib/github";
import { LICENSE_URL, RELEASES_URL, REPO_URL } from "@/lib/site";

// The version and size line follows the release lookup, refreshed at most every 60 seconds.
export const revalidate = 60;

function Section({
  id,
  title,
  children,
  className = "",
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`py-24 sm:py-32 ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <h2 id={`${id}-title`} className="text-section font-bold tracking-[-0.02em] text-balance">
            {title}
          </h2>
        </Reveal>
        {children}
      </div>
    </section>
  );
}

const promises = ["Source-available · Free to use", "Your key, your model", "Memory stays on your machine", "No account, no subscription"];

// Outside accounts of the same problem, linked under "Why I built this".
const evidence = [
  { label: "A CEO’s guide to Claude Code for non-technical people", href: "https://michaelcrist.substack.com/p/claude-code" },
  {
    label: "Why permission prompts don’t protect people who can’t read code",
    href: "https://dev.to/minatoplanb/-dangerously-skip-permissions-the-claude-code-flag-every-vibe-coder-needs-4382",
  },
  { label: "Claude Code isn’t just for developers", href: "https://cashandcache.substack.com/p/claude-code-isnt-just-for-developers" },
];

const notYet = [
  "MyBuildy runs the loop. You approve each step; he never sends anything on his own.",
  "Four of the six loop-engineering blocks are built. Scheduled runs and tool connectors are on the roadmap.",
  "Windows is tested most. macOS support is brand new — tell me what breaks.",
  "The installers are not code-signed yet, so Windows and macOS will both warn you the first time. Instructions are in the README.",
];

const install = [
  "Download the installer for your computer.",
  "Open it. The first launch shows a warning because it is not code-signed yet; the README says what to click.",
  "Paste an API key from your AI provider into Settings.",
  "Tell Buildy what you are building, then point him at your AI coding agent’s window.",
];

export default async function Home() {
  const [downloads, stars] = await Promise.all([getDownloads(), getStarCount()]);

  return (
    <>
      <RevealObserver />
      <a
        href="#main"
        className="sr-only z-[60] rounded-full bg-orange px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <TopBar stars={stars} />

      <main id="main" className="overflow-x-clip">
        {/* 2. Hero */}
        <Hero downloads={downloads} />

        {/* 3. Promises strip */}
        <div className="border-y border-line">
          <ul className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-6 text-small text-muted sm:px-6 lg:justify-between lg:px-8">
            {promises.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-orange" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* 4. Who is Buildy */}
        <section id="who" aria-labelledby="who-title" className="py-24 sm:py-32">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-8">
            <Reveal className="relative isolate mx-auto w-[min(76vw,380px)] lg:w-full lg:max-w-[440px]">
              <BuildyStates />
            </Reveal>
            <div>
              <Reveal>
                <h2 id="who-title" className="text-section font-bold tracking-[-0.02em]">
                  Who is Buildy?
                </h2>
              </Reveal>
              <Reveal className="mt-8 max-w-[38rem] space-y-5 text-body text-text/85">
                <p>
                  Buildy is a small orange robot who sits on top of your screen and watches one window: the one where
                  your AI coding agent is working.
                </p>
                <p>
                  He reads what just happened and says it back to you in plain English. He tells you whether you are
                  still heading toward what you asked for. He writes the next prompt for you, and sends it when you
                  click.
                </p>
                <p>
                  When the agent finishes something, he checks whether it actually worked. When a decision needs a
                  human, he stops and asks you instead of guessing.
                </p>
                <p>He remembers your project between sessions, so tomorrow he knows what you built today.</p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* 5. Why I built this */}
        <Section id="why" title="Why I built this" className="bg-surface/60">
          <Reveal className="mt-10 max-w-[44rem] space-y-6 text-note text-text">
            <p>I meet a lot of non-technical people who are already using Claude Code.</p>
            <p>
              They didn&rsquo;t start there. They started in Lovable or Replit or Bolt, building in a browser and
              watching a preview update as they typed. It worked — until they needed something that lived outside
              that box: their own files, their own project, a real git history, their own machine, their own keys.
              That&rsquo;s when they install a coding agent. They&rsquo;re right to. That&rsquo;s where the control
              is.
            </p>
            <p>And that&rsquo;s where the feedback disappears.</p>
            <p>
              In the browser builder, something appears on screen and you know it worked. A coding agent tells you
              what it did in diffs, file paths and command output. Forty lines scroll past and you cannot tell whether
              it just shipped a feature or broke the project. So when it asks &ldquo;Allow?&rdquo;, you press Yes —
              not because you judged it safe, but because you have no way to judge at all. One CEO building
              dashboards with Claude Code admitted to googling every single command for his first week, just to be
              sure nothing would break. A developer writing about the same problem called it a design mismatch:
              asking non-programmers to answer programmer-level safety questions.
            </p>
            <p>
              It isn&rsquo;t that coding agents are too hard. It&rsquo;s that they never tell you, in words you
              understand, what they just did.
            </p>
            <p>
              Every tool built for that moment assumes you can read code. So I built the one that doesn&rsquo;t.
            </p>
            <p className="border-l-2 border-orange pl-5 text-body text-muted">
              <span className="font-bold text-text">Sukin Shetty</span>
              <br />
              Solution Forge Labs, Bengaluru
            </p>
            <p className="text-small text-muted">
              Not just my experience:{" "}
              {evidence.map((e, i) => (
                <Fragment key={e.href}>
                  {i > 0 && " · "}
                  <a
                    href={e.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-muted/50 underline-offset-4 transition-colors hover:text-text hover:decoration-orange"
                  >
                    {e.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </Fragment>
              ))}
            </p>
          </Reveal>
        </Section>

        {/* 6. Watch it work */}
        <Section id="demo" title="Watch it work">
          <Reveal className="mx-auto max-w-5xl">
            <DemoVideo />
          </Reveal>
        </Section>

        {/* 7. How it works */}
        <Section id="how-it-works" title="How it works">
          <HowItWorks />
        </Section>

        {/* 8. Features */}
        <Section id="features" title="What he does for you">
          <Reveal>
            <Features />
          </Reveal>
        </Section>

        {/* 9. Works with */}
        <Section id="works-with" title="Works with">
          <Reveal className="mt-10 grid max-w-5xl gap-10 md:grid-cols-2">
            <div>
              <h3 className="text-small font-bold uppercase tracking-[0.14em] text-orange">Coding agents</h3>
              <p className="mt-3 text-body text-text/85">
                Claude Code, Codex CLI, and any coding agent that runs in a terminal.
              </p>
            </div>
            <div>
              <h3 className="text-small font-bold uppercase tracking-[0.14em] text-orange">AI providers</h3>
              <p className="mt-3 text-body text-text/85">
                Anthropic, OpenAI, Google, OpenRouter, or local models through Ollama and LM Studio.
              </p>
            </div>
          </Reveal>
        </Section>

        {/* 10. What it doesn't do yet */}
        <Section id="not-yet" title="What it doesn’t do yet">
          <Reveal className="mt-10 max-w-3xl">
            <ul className="divide-y divide-line border-y border-line">
              {notYet.map((line) => (
                <li key={line} className="py-5 text-body text-text/85">
                  {line}
                </li>
              ))}
            </ul>
          </Reveal>
        </Section>

        {/* 11. Get started */}
        <Section id="get-started" title="Get started" className="bg-surface/60">
          <div className="mt-10 grid gap-14 lg:grid-cols-2 lg:gap-20">
            <Reveal>
              <p className="max-w-[34rem] text-body text-text/85">
                Before you start, you need two things: a coding agent such as Claude Code already installed, and an
                API key from one AI provider.
              </p>
              <p className="mt-4 max-w-[34rem] text-body text-text/85">
                Free for anyone to use, including for work. You just can&rsquo;t resell it.
              </p>
              <DownloadButtons downloads={downloads} className="mt-8" />
            </Reveal>
            <Reveal>
              <ol className="space-y-4">
                {install.map((step, i) => (
                  <li key={step} className="flex gap-4 text-body text-text/85">
                    <span
                      aria-hidden="true"
                      className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-small font-bold text-orange"
                    >
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </Section>
      </main>

      {/* 12. Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 py-14 sm:px-6 md:flex-row md:justify-between lg:px-8">
          <div className="group flex items-center gap-4">
            <Image
              src="/images/buildy-speaking.png"
              alt="Buildy waving goodbye"
              width={512}
              height={768}
              sizes="64px"
              className="h-24 w-16 origin-[50%_80%] object-contain group-hover:[animation:buildy-wave_1.2s_ease-in-out]"
            />
            <p className="text-small text-muted">
              Built by <span className="text-text">Sukin Shetty</span> · Solution Forge Labs
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-small text-muted">
              <li>
                <a href={REPO_URL} className="inline-flex items-center gap-2 transition-colors hover:text-text">
                  <GitHubMark className="size-4" />
                  GitHub
                </a>
              </li>
              <li>
                <a href={RELEASES_URL} className="transition-colors hover:text-text">
                  Releases
                </a>
              </li>
              <li>
                <a href={LICENSE_URL} className="transition-colors hover:text-text">
                  PolyForm Shield licence
                </a>
              </li>
              <li>
                <Link href="/privacy" className="transition-colors hover:text-text">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition-colors hover:text-text">
                  Terms
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </>
  );
}
