"use client";

import { ChevronDown, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Platform } from "@/lib/signup";
import { downloadPath } from "@/lib/site";

type Props = {
  className: string;
  attention: React.HTMLAttributes<HTMLElement>;
  /** Called from a DMG link's click. The handler decides whether to let the download start (it
   *  prevents it until the questions are answered) and opens the download modal. */
  onDownload?: (platform: Platform, url: string, returnFocus: HTMLElement | null, e: React.MouseEvent) => void;
  /** Ties a click made before the page was ready to this menu (app/layout.tsx). */
  owner?: string;
  /** Open straight away: the button was clicked before this menu had loaded. */
  initialOpen?: boolean;
};

/** "Download for Mac" with a popover choosing between the two DMGs. Loaded lazily: it pulls in base-ui. */
export default function MacDownloadMenu({ className, attention, onDownload, owner, initialOpen = false }: Props) {
  const armRef = useRef<HTMLAnchorElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(initialOpen);
  useEffect(() => {
    if (initialOpen) setOpen(true);
  }, [initialOpen]);

  // The menu closes and the download modal opens, returning focus to the Mac button when it is
  // dismissed. Links go through mybuildy.com (/download/*), never straight to GitHub.
  const downloaded = (platform: Platform) => (e: React.MouseEvent) => {
    setOpen(false);
    onDownload?.(platform, downloadPath(platform), triggerRef.current, e);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        ref={triggerRef}
        className={`${className} cursor-pointer`}
        data-download="mac"
        data-download-owner={owner}
        {...attention}
      >
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
          href={downloadPath("mac-arm64")}
          onClick={downloaded("mac-arm64")}
          className="block rounded-xl border border-orange/50 bg-orange/10 px-3 py-3 text-body font-bold hover:bg-orange/15"
        >
          Apple Silicon (M1 and later)
        </a>
        <a
          href={downloadPath("mac-x64")}
          onClick={downloaded("mac-x64")}
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
