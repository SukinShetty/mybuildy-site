"use client";

import dynamic from "next/dynamic";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { formatSize, type Downloads } from "@/lib/github";
import type { Platform } from "@/lib/signup";
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

// Lazy: the post-download panel is only fetched once someone points at, focuses or clicks a button.
const loadGuide = () => import("@/components/download-guide");
const DownloadGuide = dynamic(loadGuide, { ssr: false });

// This browser has already seen the optional questions: show only the install steps from then on.
const QUESTIONS_SEEN_KEY = "mybuildy.downloadQuestionsSeen";
const readSeen = () => {
  try {
    return localStorage.getItem(QUESTIONS_SEEN_KEY) === "1";
  } catch {
    return false;
  }
};
const markSeen = () => {
  try {
    localStorage.setItem(QUESTIONS_SEEN_KEY, "1");
  } catch {
    // Private mode / storage blocked: the questions may simply show again next time.
  }
};

type Props = {
  downloads: Downloads;
  /** Called with the hovered or focused button, or null when it leaves. Lets the hero robot look at it. */
  onAttention?: (el: HTMLElement | null) => void;
  /** A short muted line shown directly under the buttons. */
  note?: string;
  className?: string;
};

type Guide = { platform: Platform; askQuestions: boolean; returnFocus: HTMLElement | null };

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

  // Called from a download link's click handler. The link is NOT prevented: the browser starts
  // the file exactly as before, and the panel opens after.
  const openGuide = (platform: Platform, from: HTMLElement | null) => {
    const askQuestions = !readSeen();
    if (askQuestions) markSeen();
    setGuide({ platform, askQuestions, returnFocus: from });
    setGuideOpen(true);
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
          // Only a real installer download opens the panel; the releases-page fallback just navigates.
          onClick={windows ? (e) => openGuide("windows", e.currentTarget) : undefined}
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
          version={version}
          askQuestions={guide.askQuestions}
          returnFocus={guide.returnFocus}
        />
      )}
    </div>
  );
}
