"use client";

import dynamic from "next/dynamic";
import { ChevronDown, Download } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { formatSize, type Downloads } from "@/lib/github";
import type { Platform, SignupPayload } from "@/lib/signup";
import { downloadPath } from "@/lib/site";
import { cn } from "@/lib/utils";

const base =
  "inline-flex h-14 items-center justify-center gap-2.5 rounded-full px-7 text-body font-bold transition-colors duration-200";
const primary = "bg-orange text-ink hover:bg-amber";
const secondary = "border border-line bg-surface text-text hover:border-orange/60";

type Attention = React.HTMLAttributes<HTMLElement>;

/** Same look as the Mac menu's trigger, shown for the moment before the menu's code has loaded.
 *  A click on it is remembered (app/layout.tsx) and opens the menu once it has loaded. */
function MacPlaceholder({ className, owner }: { className: string; owner?: string }) {
  return (
    <button type="button" className={className} data-download="mac" data-download-owner={owner}>
      <Download className="size-5" aria-hidden="true" />
      Download for Mac
      <ChevronDown className="size-4 opacity-70" aria-hidden="true" />
    </button>
  );
}

// Lazy: the popover pulls in base-ui. Until it has loaded, a placeholder with the same look stands
// in; its click is remembered and opens the menu once loaded.
const MacDownloadMenuLazy = dynamic(() => import("@/components/mac-download-menu"), { ssr: false });

type MacMenuProps = React.ComponentProps<typeof MacDownloadMenuLazy>;
function MacDownloadMenu(props: MacMenuProps) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    void import("@/components/mac-download-menu").then(() => setLoaded(true));
  }, []);
  return loaded ? <MacDownloadMenuLazy {...props} /> : <MacPlaceholder className={props.className} owner={props.owner} />;
}

// Lazy: the download modal is only fetched once someone points at, focuses or clicks a button.
const loadGuide = () => import("@/components/download-guide");
const DownloadGuide = dynamic(loadGuide, { ssr: false });

// This browser has already answered the questions: from then on a download button downloads
// straight away and the modal shows only the install steps.
const SUBMITTED_KEY = "mybuildy.signupSubmitted";
const readSubmitted = () => {
  try {
    return localStorage.getItem(SUBMITTED_KEY) === "1";
  } catch {
    return false;
  }
};
const markSubmitted = () => {
  try {
    localStorage.setItem(SUBMITTED_KEY, "1");
  } catch {
    // Private mode / storage blocked: the form may simply show again next time.
  }
};

/** Start a download from script. /download/* redirects to the file, served as an attachment, so the page
 *  stays put; if the file is unavailable it lands on the friendly page on mybuildy.com instead. */
function startDownload(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const SAVE_TIMEOUT_MS = 5000;

/** Save the answers, waiting at most SAVE_TIMEOUT_MS. Resolves true only when the row was stored
 *  (201). Any failure is logged and resolves false: the download never waits longer than that. */
async function saveAnswers(answers: SignupPayload): Promise<boolean> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), SAVE_TIMEOUT_MS);
  try {
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
      keepalive: true,
      signal: abort.signal,
    });
    if (res.status !== 201) console.warn(`[signup] answers not stored (HTTP ${res.status}); the download goes ahead`);
    return res.status === 201;
  } catch (error) {
    console.warn("[signup] could not reach the server; the download goes ahead", error);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

type EarlyDownload = { platform: string | null; owner: string | null };
declare global {
  interface Window {
    __mbDownloadsReady?: boolean;
    __mbEarlyDownload?: EarlyDownload | null;
  }
}

type Props = {
  downloads: Downloads;
  /** Called with the hovered or focused button, or null when it leaves. Lets the hero robot look at it. */
  onAttention?: (el: HTMLElement | null) => void;
  /** A short muted line shown directly under the buttons. */
  note?: string;
  className?: string;
};

type Guide = { platform: Platform; url: string; askFirst: boolean; returnFocus: HTMLElement | null };

export function DownloadButtons({ downloads, onAttention, note, className }: Props) {
  const { windows, macArm, macIntel, version } = downloads;
  const [isMac, setIsMac] = useState(false);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [macOpenAtStart, setMacOpenAtStart] = useState(false);
  const owner = useId(); // ties an early click to THIS set of buttons (hero or Get started)
  const winButtonRef = useRef<HTMLButtonElement>(null);

  // Whichever platform the visitor is on gets the filled button. Order never changes.
  useEffect(() => {
    const ua = navigator.userAgent;
    setIsMac(/Macintosh|Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua));
  }, []);

  // A download button was pressed. Nothing downloads by itself: the buttons are not file links.
  // The first time, the form opens and the file starts only after Submit (closing it starts
  // nothing). Once this browser has submitted, the file starts at once and the modal shows the
  // install steps.
  const openGuide = (platform: Platform, url: string, from: HTMLElement | null, e?: React.MouseEvent) => {
    e?.preventDefault();
    const askFirst = !readSubmitted();
    if (!askFirst) startDownload(url);
    setGuide({ platform, url, askFirst, returnFocus: from });
    setGuideOpen(true);
  };

  // A click made before this code was ready (remembered by app/layout.tsx): replay it now.
  useEffect(() => {
    window.__mbDownloadsReady = true;
    const early = window.__mbEarlyDownload;
    if (!early || early.owner !== owner) return;
    window.__mbEarlyDownload = null;
    if (early.platform === "windows") openGuide("windows", downloadPath("windows"), winButtonRef.current);
    else if (early.platform === "mac") setMacOpenAtStart(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  // Submit: store the answers first (at most a few seconds), then start the file, still through
  // mybuildy.com. A failed save is logged and never keeps anyone from the download.
  const submit = async (answers: SignupPayload): Promise<void> => {
    if (!guide) return;
    await saveAnswers(answers);
    startDownload(guide.url);
    markSubmitted();
  };

  const warm = () => void loadGuide();
  const attention: Attention = {
    onPointerEnter: (e) => {
      warm();
      onAttention?.(e.currentTarget);
    },
    onPointerLeave: () => onAttention?.(null),
    onFocus: (e) => {
      warm();
      onAttention?.(e.currentTarget);
    },
    onBlur: () => onAttention?.(null),
  };

  const macClass = cn(base, isMac ? primary : secondary);
  const winClass = cn(base, isMac ? secondary : primary);
  const macAsset = macArm ?? macIntel;
  const sizes = [windows && `Windows ${formatSize(windows.size)}`, macAsset && `Mac ${formatSize(macAsset.size)}`].filter(
    Boolean,
  );

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* A button, not a link to the file: nothing may download before the form (see openGuide).
            Downloads go through mybuildy.com (/download/*), never to a GitHub page. */}
        <button
          ref={winButtonRef}
          type="button"
          data-download="windows"
          data-download-owner={owner}
          className={cn(winClass, "cursor-pointer")}
          {...attention}
          onClick={(e) => openGuide("windows", downloadPath("windows"), e.currentTarget, e)}
        >
          <Download className="size-5" aria-hidden="true" />
          Download for Windows
        </button>
        <MacDownloadMenu
          className={macClass}
          attention={attention}
          onDownload={openGuide}
          owner={owner}
          initialOpen={macOpenAtStart}
        />
      </div>
      {note && <p className="mt-3 text-small text-muted">{note}</p>}
      {version && <p className={cn("text-small text-muted", note ? "mt-1.5" : "mt-3")}>{[version, ...sizes].join(" · ")}</p>}

      {guide && (
        <DownloadGuide
          open={guideOpen}
          onOpenChange={setGuideOpen}
          platform={guide.platform}
          downloadUrl={guide.url}
          version={version}
          askFirst={guide.askFirst}
          onSubmit={submit}
          returnFocus={guide.returnFocus}
        />
      )}
    </div>
  );
}
