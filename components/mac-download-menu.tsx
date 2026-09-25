"use client";

import { ChevronDown, Download } from "lucide-react";
import { useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DownloadAsset } from "@/lib/github";
import type { Platform } from "@/lib/signup";

type Props = {
  macArm?: DownloadAsset;
  macIntel?: DownloadAsset;
  fallbackUrl: string;
  className: string;
  attention: React.HTMLAttributes<HTMLElement>;
  /** Called AFTER a DMG link's click (never prevented), to show the post-download panel. */
  onDownload?: (platform: Platform, returnFocus: HTMLElement | null) => void;
};

/** "Download for Mac" with a popover choosing between the two DMGs. Loaded lazily: it pulls in base-ui. */
export default function MacDownloadMenu({ macArm, macIntel, fallbackUrl, className, attention, onDownload }: Props) {
  const armRef = useRef<HTMLAnchorElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  // The link keeps its default action (the browser starts the DMG); then the menu closes and
  // the panel opens, returning focus to the Mac button when it is dismissed.
  const downloaded = (platform: Platform, asset?: DownloadAsset) => () => {
    setOpen(false);
    if (asset) onDownload?.(platform, triggerRef.current);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger ref={triggerRef} className={`${className} cursor-pointer`} {...attention}>
        <Download className="size-5" aria-hidden="true" />
        Download for Mac
        <ChevronDown className="size-4 opacity-70" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        initialFocus={armRef}
        className="w-80 gap-1 rounded-2xl border border-line bg-surface p-2 text-text shadow-none ring-0"
      >
        <p className="px-3 pb-1 pt-2 text-small text-muted">Which Mac do you have?</p>
        <a
          ref={armRef}
          href={macArm?.url ?? fallbackUrl}
          onClick={downloaded("mac-arm64", macArm)}
          className="block rounded-xl border border-orange/50 bg-orange/10 px-3 py-3 text-body font-bold hover:bg-orange/15"
        >
          Apple Silicon (M1 and later)
        </a>
        <a
          href={macIntel?.url ?? fallbackUrl}
          onClick={downloaded("mac-x64", macIntel)}
          className="block rounded-xl border border-transparent px-3 py-3 text-body hover:border-line hover:bg-white/5"
        >
          Intel
        </a>
        <p className="px-3 pb-2 pt-1 text-small text-muted">
          Not sure? Apple menu, About This Mac: &ldquo;Chip: Apple M&hellip;&rdquo; means Apple Silicon.
        </p>
      </PopoverContent>
    </Popover>
  );
}
