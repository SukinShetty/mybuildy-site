"use client";

import dynamic from "next/dynamic";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { formatSize, type Downloads } from "@/lib/github";
import type { Platform, SignupPayload } from "@/lib/signup";
import { RELEASES_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

const base =
  "inline-flex h-14 items-center justify-center gap-2.5 rounded-full px-7 text-body font-bold transition-colors duration-200";
const primary = "bg-orange text-ink hover:bg-amber";
const secondary = "border border-line bg-surface text-text hover:border-orange/60";

type Attention = React.HTMLAttributes<HTMLElement>;

/** Plain link to the releases page. Also stands in for the Mac menu while that loads, so it always works. */
function MacLink({ href, className, attention }: { href: string; className: string; attention: Attention }) {
  return (
    <a href={href} className={className} {...attention}>
      <Download className="size-5" aria-hidden="true" />
      Download for Mac
    </a>
  );
}

// Lazy: the popover pulls in base-ui. Until it loads, the Mac button is a working link to the releases page.
const MacDownloadMenu = dynamic(() => import("@/components/mac-download-menu"), {
  ssr: false,
  loading: () => <MacLink href={RELEASES_URL} className={cn(base, secondary)} attention={{}} />,
});

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

/** Start a download from script. Release assets are served as attachments, so the page stays put. */
function startDownload(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Save the answers without waiting on the result. keepalive lets it finish even as the download starts. */
function saveAnswers(answers: SignupPayload) {
  try {
    fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never let saving get between someone and the file.
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
  const { windows, macArm, macIntel, version, fallbackUrl } = downloads;
  const [isMac, setIsMac] = useState(false);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  // Whichever platform the visitor is on gets the filled button. Order never changes.
  useEffect(() => {
    const ua = navigator.userAgent;
    setIsMac(/Macintosh|Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua));
  }, []);

  // Called from a download link's click handler. The first time, the default action is prevented:
  // nothing downloads until the form is submitted (closing it starts nothing). Once this browser
  // has submitted, the link downloads as normal and the modal shows the install steps.
  const openGuide = (platform: Platform, url: string, from: HTMLElement | null, e: React.MouseEvent) => {
    const askFirst = !readSubmitted();
    if (askFirst) e.preventDefault();
    setGuide({ platform, url, askFirst, returnFocus: from });
    setGuideOpen(true);
  };

  // Submit: send the answers, start the file straight away, remember this browser. The save is
  // never awaited, so a network or database problem can't keep anyone from the download.
  const submit = (answers: SignupPayload) => {
    if (!guide) return;
    saveAnswers(answers);
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
        <a
          href={windows?.url ?? fallbackUrl}
          className={winClass}
          {...attention}
          // Only a real installer opens the modal; the releases-page fallback just navigates.
          onClick={windows ? (e) => openGuide("windows", windows.url, e.currentTarget, e) : undefined}
        >
          <Download className="size-5" aria-hidden="true" />
          Download for Windows
        </a>
        {macAsset ? (
          <MacDownloadMenu
            macArm={macArm}
            macIntel={macIntel}
            fallbackUrl={fallbackUrl}
            className={macClass}
            attention={attention}
            onDownload={openGuide}
          />
        ) : (
          <MacLink href={fallbackUrl} className={macClass} attention={attention} />
        )}
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
