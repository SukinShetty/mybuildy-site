"use client";

/**
 * The post-download panel: an install warning for the platform just downloaded (always), and a
 * few optional questions (only the first time this browser downloads). Opened AFTER the
 * download link has done its normal job — nothing here can block or delay the file.
 *
 * Loaded lazily by DownloadButtons. base-ui's Dialog provides the modal behaviour: focus trap,
 * Escape and outside-click to dismiss, focus returned to the download link on close.
 */

import { Dialog } from "@base-ui/react/dialog";
import { Check, Copy, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  AGENT_OPTIONS,
  BUILD_OPTIONS,
  SELF_OPTIONS,
  isBlank,
  type Platform,
} from "@/lib/signup";
import { REPO_URL } from "@/lib/site";

const ISSUES_URL = `${REPO_URL}/issues`;
const CHECKSUM_URL = `${REPO_URL}/releases/latest`;
const QUARANTINE_CMD = "xattr -dr com.apple.quarantine /Applications/MyBuildy.app";

const PLATFORM_LABEL: Record<Platform, string> = {
  windows: "Windows",
  "mac-arm64": "Mac (Apple Silicon)",
  "mac-x64": "Mac (Intel)",
};

const linkClass =
  "underline decoration-orange/60 underline-offset-4 transition-colors hover:text-text hover:decoration-orange";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: Platform;
  version?: string;
  askQuestions: boolean;
  /** The download link that opened the panel; focus returns there on close. */
  returnFocus: HTMLElement | null;
};

export default function DownloadGuide({ open, onOpenChange, platform, version, askQuestions, returnFocus }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isMac = platform !== "windows";

  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[70] bg-black/75 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup
          initialFocus={headingRef}
          finalFocus={() => returnFocus ?? true}
          onKeyDown={trapTab}
          className="fixed left-1/2 top-1/2 z-[71] max-h-[calc(100dvh-1.5rem)] w-[min(calc(100vw-1.5rem),40rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-3xl border border-line bg-surface p-5 text-text shadow-2xl transition-[opacity,scale] duration-200 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 motion-reduce:transition-none sm:p-7"
        >
          <Dialog.Close
            aria-label="Close"
            className={`absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-text ${focusRing}`}
          >
            <X className="size-5" aria-hidden="true" />
          </Dialog.Close>

          {/* The install warning: first, prominent, always shown. */}
          <section className="mr-10 rounded-2xl border-2 border-orange bg-orange/10 p-4 sm:mr-8 sm:p-5">
            <p className="text-small text-muted">
              MyBuildy {version ? `${version} ` : ""}for {PLATFORM_LABEL[platform]} is downloading
            </p>
            <Dialog.Title
              ref={headingRef}
              tabIndex={-1}
              className="mt-1 text-[1.35rem] font-bold leading-tight tracking-[-0.01em] outline-none sm:text-note"
            >
              {isMac ? "One more step: macOS will warn you" : "One more step: Windows will warn you"}
            </Dialog.Title>
            {isMac ? <MacSteps /> : <WindowsSteps />}
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-small text-muted">
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={`${linkClass} ${focusRing}`}>
                View the source
              </a>
              <a href={CHECKSUM_URL} target="_blank" rel="noopener noreferrer" className={`${linkClass} ${focusRing}`}>
                Verify the checksum
              </a>
            </p>
          </section>

          {askQuestions && <Questions platform={platform} onDone={() => onOpenChange(false)} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="radio"]), input[type="radio"]:checked, [tabindex]:not([tabindex="-1"])';

/**
 * Keep Tab inside the panel: wrap from the last control to the first and back. (base-ui's own
 * focus guards let one Tab escape to the page in testing, so the wrap is explicit here.)
 * Unchecked radios are skipped like the browser does: a radio group is one Tab stop.
 */
function trapTab(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== "Tab") return;
  const all = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(TABBABLE));
  // A radio group with nothing checked is still one stop: its first radio.
  const firstRadio = e.currentTarget.querySelector<HTMLElement>('input[type="radio"]');
  if (firstRadio && !e.currentTarget.querySelector('input[type="radio"]:checked')) all.push(firstRadio);
  const tabbable = all
    .filter((el) => el.offsetParent !== null || el.getClientRects().length > 0 || el.matches("input"))
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  if (tabbable.length === 0) return;
  const first = tabbable[0];
  const last = tabbable[tabbable.length - 1];
  const active = document.activeElement;
  if (!e.shiftKey && (active === last || !e.currentTarget.contains(active))) {
    e.preventDefault();
    first.focus();
  } else if (e.shiftKey && (active === first || !e.currentTarget.contains(active))) {
    e.preventDefault();
    last.focus();
  }
}

function WindowsSteps() {
  return (
    <>
      <Dialog.Description className="mt-3 text-body text-text">
        When you run the installer, Windows shows a blue &ldquo;Windows protected your PC&rdquo; screen. Click{" "}
        <strong>More info</strong>, then <strong>Run anyway</strong>.
      </Dialog.Description>
      <p className="mt-3 text-small text-muted">
        This happens to every app that isn&rsquo;t signed with a paid certificate yet, not because anything is wrong
        with the file. MyBuildy is open source — you can read every line of the code, and check the file&rsquo;s
        SHA256 against the published checksum.
      </p>
    </>
  );
}

function MacSteps() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard
      ?.writeText(QUARANTINE_CMD)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <>
      <Dialog.Description className="mt-3 text-body text-text">
        Open the DMG and drag MyBuildy to Applications. The first time you open it, <strong>right-click</strong> the
        app and choose <strong>Open</strong>, then <strong>Open</strong> again. Opening it by double-click will be
        blocked.
      </Dialog.Description>
      <p className="mt-3 text-small text-muted">If macOS says the app is damaged, run this in Terminal once:</p>
      <div className="mt-2 flex items-stretch gap-2">
        <code className="min-w-0 flex-1 break-all rounded-xl border border-line bg-ink px-3 py-2.5 font-mono text-[0.8rem] leading-6 text-text">
          {QUARANTINE_CMD}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy the command"}
          className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 text-small text-text transition-colors hover:border-orange/60 ${focusRing}`}
        >
          {copied ? <Check className="size-4 text-orange" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-3 text-small text-muted">
        macOS will also ask for Screen Recording and Accessibility permission. MyBuildy explains each one when it
        needs it, and cannot watch your screen or type for you without them.
      </p>
    </>
  );
}

function Questions({ platform, onDone }: { platform: Platform; onDone: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [build, setBuild] = useState<string[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  const [self, setSelf] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const answers = { name, email, build, agents, self };
    if (isBlank(answers)) {
      onDone();
      return;
    }
    // Fire and forget: whatever the server says, the visitor sees a thank-you.
    fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...answers, platform }),
      keepalive: true,
    }).catch(() => {});
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="mt-7" role="status">
        <p className="text-note font-bold">Thank you — that really helps.</p>
        <p className="mt-3 text-body text-text/85">
          If it doesn&rsquo;t install, tell me —{" "}
          <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer" className={`${linkClass} ${focusRing}`}>
            open an issue on GitHub
          </a>
          .
        </p>
      </div>
    );
  }

  const inputClass = `mt-2 block min-h-12 w-full rounded-xl border border-line bg-ink px-4 text-body text-text placeholder:text-muted/70 transition-colors hover:border-orange/40 focus:border-orange ${focusRing}`;

  return (
    <form onSubmit={onSubmit} className="mt-8">
      <h3 className="text-[1.25rem] font-bold leading-tight">While that downloads — a few quick questions?</h3>
      <p className="mt-1.5 text-small text-muted">So I know who I&rsquo;m building for. Optional, and no account needed.</p>

      <div className="mt-6 space-y-6">
        <label className="block">
          <span className="text-small font-bold">Name</span>
          <input
            type="text"
            name="name"
            autoComplete="given-name"
            maxLength={80}
            placeholder="First name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-small font-bold">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby="signup-email-note"
            className={inputClass}
          />
          <span id="signup-email-note" className="mt-2 block text-small text-muted">
            Only for MyBuildy updates. No newsletter, no sharing, unsubscribe any time.
          </span>
        </label>

        <PillGroup legend="What are you hoping to build?" hint="Tick any">
          {BUILD_OPTIONS.map((o) => (
            <Pill key={o} type="checkbox" name="build" checked={build.includes(o)} onChange={() => toggle(build, setBuild, o)}>
              {o}
            </Pill>
          ))}
        </PillGroup>

        <PillGroup legend="Which coding agent do you use?" hint="Tick any">
          {AGENT_OPTIONS.map((o) => (
            <Pill key={o} type="checkbox" name="agents" checked={agents.includes(o)} onChange={() => toggle(agents, setAgents, o)}>
              {o}
            </Pill>
          ))}
        </PillGroup>

        <PillGroup legend="How would you describe yourself?" hint="Choose one">
          {SELF_OPTIONS.map((o) => (
            <Pill key={o} type="radio" name="self" checked={self === o} onChange={() => setSelf(o)}>
              {o}
            </Pill>
          ))}
        </PillGroup>
      </div>

      {/* Submit and Skip carry equal visual weight: same size, same style. */}
      <div className="mt-8 grid grid-cols-2 gap-3">
        <button type="submit" className={`min-h-12 rounded-full border border-orange/70 px-5 text-body font-bold text-text transition-colors hover:bg-orange/10 ${focusRing}`}>
          Submit
        </button>
        <button type="button" onClick={onDone} className={`min-h-12 rounded-full border border-orange/70 px-5 text-body font-bold text-text transition-colors hover:bg-orange/10 ${focusRing}`}>
          Skip
        </button>
      </div>
    </form>
  );
}

function PillGroup({ legend, hint, children }: { legend: string; hint: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-small font-bold">
        {legend} <span className="font-normal text-muted">· {hint}</span>
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Pill({
  type,
  name,
  checked,
  onChange,
  children,
}: {
  type: "checkbox" | "radio";
  name: string;
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`inline-flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-full border px-4 py-2 text-small transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-amber ${
        checked ? "border-orange bg-orange/15 text-text" : "border-line text-text/85 hover:border-orange/50"
      }`}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="sr-only" />
      {checked && <Check className="size-4 text-orange" aria-hidden="true" />}
      {children}
    </label>
  );
}
