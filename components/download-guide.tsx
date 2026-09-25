"use client";

/**
 * The download modal. The first time a browser downloads, it opens BEFORE anything downloads,
 * with a few questions; "Submit and download" saves the answers, starts the file and swaps the
 * form for the install warning. After that (remembered in localStorage by DownloadButtons) it
 * opens straight on the install warning while the download runs. Closing the form starts nothing.
 *
 * Loaded lazily by DownloadButtons. base-ui's Dialog provides the modal behaviour: focus trap,
 * Escape and outside-click to dismiss, focus returned to the download button on close.
 */

import { Dialog } from "@base-ui/react/dialog";
import { Check, Copy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  AGENT_OPTIONS,
  BUILD_OPTIONS,
  SELF_OPTIONS,
  formProblems,
  type Platform,
  type SignupField,
  type SignupPayload,
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
  /** Direct link to the installer, for "If it didn't, click here". */
  downloadUrl: string;
  version?: string;
  /** Show the questions first (this browser hasn't submitted yet). */
  askFirst: boolean;
  /** Save the answers and start the download. Never throws, never blocks. */
  onSubmit: (answers: SignupPayload) => void;
  /** The download button that opened the modal; focus returns there on close. */
  returnFocus: HTMLElement | null;
};

export default function DownloadGuide({ open, onOpenChange, platform, downloadUrl, version, askFirst, onSubmit, returnFocus }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const showForm = askFirst && !submitted;

  // When the form gives way to the instructions, move focus to the new heading so keyboard and
  // screen-reader users land on the install steps.
  useEffect(() => {
    if (submitted) headingRef.current?.focus();
  }, [submitted]);

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

          {showForm ? (
            <Questions
              headingRef={headingRef}
              platform={platform}
              onSubmit={(answers) => {
                onSubmit(answers);
                setSubmitted(true);
              }}
            />
          ) : (
            <>
              {/* The install warning: first, prominent, always shown once the file is on its way. */}
              <section className="mr-10 rounded-2xl border-2 border-orange bg-orange/10 p-4 sm:mr-8 sm:p-5">
                <p role="status" className="text-small text-muted">
                  Your download of MyBuildy {version ? `${version} ` : ""}for {PLATFORM_LABEL[platform]} has started.
                  If it didn&rsquo;t,{" "}
                  <a href={downloadUrl} className={`${linkClass} ${focusRing}`}>
                    click here
                  </a>
                  .
                </p>
                <Dialog.Title
                  ref={headingRef}
                  tabIndex={-1}
                  className="mt-2 text-[1.35rem] font-bold leading-tight tracking-[-0.01em] outline-none sm:text-note"
                >
                  {platform === "windows" ? "One more step: Windows will warn you" : "One more step: macOS will warn you"}
                </Dialog.Title>
                {platform === "windows" ? <WindowsSteps /> : <MacSteps />}
                <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-small text-muted">
                  <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={`${linkClass} ${focusRing}`}>
                    View the source
                  </a>
                  <a href={CHECKSUM_URL} target="_blank" rel="noopener noreferrer" className={`${linkClass} ${focusRing}`}>
                    Verify the checksum
                  </a>
                </p>
              </section>
              <p className="mt-6 text-body text-text/85">
                {submitted ? "Thank you — that really helps. " : ""}If it doesn&rsquo;t install, tell me —{" "}
                <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer" className={`${linkClass} ${focusRing}`}>
                  open an issue on GitHub
                </a>
                .
              </p>
            </>
          )}
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
      {/* Since macOS 15 Sequoia, right-click → Open no longer bypasses Gatekeeper for apps that
          aren't notarized; Open Anyway in Privacy & Security is the way through. */}
      <Dialog.Description className="mt-3 text-body text-text">
        Open the DMG and drag MyBuildy to Applications. The first time you open MyBuildy, macOS blocks it —
        that&rsquo;s expected. Click <strong>Done</strong> (not Move to Trash). Then open{" "}
        <strong>System Settings → Privacy &amp; Security</strong>, scroll to the bottom, and next to &ldquo;MyBuildy
        was blocked to protect your Mac&rdquo; click <strong>Open Anyway</strong>. Enter your password, then{" "}
        <strong>Open Anyway</strong> again. Do it soon: the button disappears after about an hour.
      </Dialog.Description>
      <p className="mt-3 text-small text-muted">
        On macOS 14 Sonoma, right-click the app and choose Open instead.
      </p>
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
        macOS will also ask for Screen Recording (called Screen &amp; System Audio Recording on newer macOS) and
        Accessibility permission. MyBuildy explains each one when it
        needs it, and cannot watch your screen or type for you without them.
      </p>
    </>
  );
}

function Questions({
  headingRef,
  platform,
  onSubmit,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  platform: Platform;
  onSubmit: (answers: SignupPayload) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [build, setBuild] = useState<string[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  const [self, setSelf] = useState<string | null>(null);
  // Messages appear only once someone tries to submit, then update live as they fix things.
  const [tried, setTried] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const answers = { name, email, build, agents, self };
  const problems = formProblems(answers);
  const ready = Object.keys(problems).length === 0;
  const shown = (field: SignupField) => (tried ? problems[field] : undefined);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) {
      setTried(true);
      // Take the visitor to the first thing that still needs an answer.
      const first = (["name", "email", "build", "agents", "self"] as const).find((f) => problems[f]);
      formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
      return;
    }
    onSubmit({ name: name.trim(), email: email.trim(), build, agents, self, platform });
  };

  const inputClass = `mt-2 block min-h-12 w-full rounded-xl border bg-ink px-4 text-body text-text placeholder:text-muted/70 transition-colors hover:border-orange/40 focus:border-orange ${focusRing}`;
  const errorClass = "mt-2 block text-small text-orange";

  return (
    <form ref={formRef} onSubmit={onFormSubmit} noValidate>
      <Dialog.Title
        ref={headingRef}
        tabIndex={-1}
        className="mr-10 text-[1.35rem] font-bold leading-tight tracking-[-0.01em] outline-none sm:mr-8 sm:text-note"
      >
        Before you download — a few quick questions
      </Dialog.Title>
      <Dialog.Description className="mt-1.5 text-small text-muted">
        So I know who I&rsquo;m building for. Takes 20 seconds.
      </Dialog.Description>

      <div className="mt-6 space-y-6">
        <label className="block">
          <span className="text-small font-bold">First name</span>
          <input
            data-field="name"
            type="text"
            name="name"
            autoComplete="given-name"
            maxLength={80}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={shown("name") ? true : undefined}
            aria-describedby={shown("name") ? "signup-name-error" : undefined}
            className={`${inputClass} ${shown("name") ? "border-orange" : "border-line"}`}
          />
          {shown("name") && (
            <span id="signup-name-error" className={errorClass}>
              {shown("name")}
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-small font-bold">Email</span>
          <input
            data-field="email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={shown("email") ? true : undefined}
            aria-describedby={shown("email") ? "signup-email-error signup-email-note" : "signup-email-note"}
            className={`${inputClass} ${shown("email") ? "border-orange" : "border-line"}`}
          />
          {shown("email") && (
            <span id="signup-email-error" className={errorClass}>
              {shown("email")}
            </span>
          )}
          <span id="signup-email-note" className="mt-2 block text-small text-muted">
            Only for MyBuildy updates. No newsletter, no sharing, unsubscribe any time.
          </span>
        </label>

        <PillGroup field="build" legend="What are you hoping to build?" hint="Tick at least one" error={shown("build")}>
          {BUILD_OPTIONS.map((o, i) => (
            <Pill key={o} field={i === 0 ? "build" : undefined} type="checkbox" name="build" checked={build.includes(o)} onChange={() => toggle(build, setBuild, o)}>
              {o}
            </Pill>
          ))}
        </PillGroup>

        <PillGroup field="agents" legend="Which coding agent do you use?" hint="Tick at least one" error={shown("agents")}>
          {AGENT_OPTIONS.map((o, i) => (
            <Pill key={o} field={i === 0 ? "agents" : undefined} type="checkbox" name="agents" checked={agents.includes(o)} onChange={() => toggle(agents, setAgents, o)}>
              {o}
            </Pill>
          ))}
        </PillGroup>

        <PillGroup field="self" legend="How would you describe yourself?" hint="Choose one" error={shown("self")}>
          {SELF_OPTIONS.map((o, i) => (
            <Pill key={o} field={i === 0 ? "self" : undefined} type="radio" name="self" checked={self === o} onChange={() => setSelf(o)}>
              {o}
            </Pill>
          ))}
        </PillGroup>
      </div>

      {/* aria-disabled rather than disabled: it looks and reads as unavailable until the form is
          complete, but a press still explains what's missing instead of doing nothing. */}
      <button
        type="submit"
        aria-disabled={!ready}
        className={`mt-8 min-h-12 w-full rounded-full px-5 text-body font-bold transition-colors ${focusRing} ${
          ready ? "bg-orange text-ink hover:bg-amber" : "cursor-not-allowed bg-orange/35 text-ink/70"
        }`}
      >
        Submit and download
      </button>
    </form>
  );
}

function PillGroup({
  field,
  legend,
  hint,
  error,
  children,
}: {
  field: SignupField;
  legend: string;
  hint: string;
  error?: string;
  children: React.ReactNode;
}) {
  const errorId = `signup-${field}-error`;
  return (
    <fieldset aria-describedby={error ? errorId : undefined} aria-invalid={error ? true : undefined}>
      <legend className="text-small font-bold">
        {legend} <span className="font-normal text-muted">· {hint}</span>
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
      {error && (
        <p id={errorId} className="mt-2 text-small text-orange">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function Pill({
  field,
  type,
  name,
  checked,
  onChange,
  children,
}: {
  /** Set on the first option of a group, so a failed submit can move focus to that group. */
  field?: SignupField;
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
      <input data-field={field} type={type} name={name} checked={checked} onChange={onChange} className="sr-only" />
      {checked && <Check className="size-4 text-orange" aria-hidden="true" />}
      {children}
    </label>
  );
}
