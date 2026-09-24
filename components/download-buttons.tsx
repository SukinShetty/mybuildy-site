"use client";

import dynamic from "next/dynamic";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { formatSize, type Downloads } from "@/lib/github";
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

type Props = {
  downloads: Downloads;
  /** Called with the hovered or focused button, or null when it leaves. Lets the hero robot look at it. */
  onAttention?: (el: HTMLElement | null) => void;
  className?: string;
};

export function DownloadButtons({ downloads, onAttention, className }: Props) {
  const { windows, macArm, macIntel, version, fallbackUrl } = downloads;
  const [isMac, setIsMac] = useState(false);

  // Whichever platform the visitor is on gets the filled button. Order never changes.
  useEffect(() => {
    const ua = navigator.userAgent;
    setIsMac(/Macintosh|Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua));
  }, []);

  const attention: Attention = onAttention
    ? {
        onPointerEnter: (e) => onAttention(e.currentTarget),
        onPointerLeave: () => onAttention(null),
        onFocus: (e) => onAttention(e.currentTarget),
        onBlur: () => onAttention(null),
      }
    : {};

  const macClass = cn(base, isMac ? primary : secondary);
  const winClass = cn(base, isMac ? secondary : primary);
  const macAsset = macArm ?? macIntel;
  const sizes = [windows && `Windows ${formatSize(windows.size)}`, macAsset && `Mac ${formatSize(macAsset.size)}`].filter(
    Boolean,
  );

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <a href={windows?.url ?? fallbackUrl} className={winClass} {...attention}>
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
          />
        ) : (
          <MacLink href={fallbackUrl} className={macClass} attention={attention} />
        )}
      </div>
      {version && <p className="mt-3 text-small text-muted">{[version, ...sizes].join(" · ")}</p>}
    </div>
  );
}
