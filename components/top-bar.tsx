"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { REPO_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { GitHubMark } from "@/components/github-mark";

const links = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "/docs", label: "Documentation" },
];

export function TopBar({ stars }: { stars: number | null }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-300",
        scrolled ? "border-line bg-surface/80 backdrop-blur-md" : "border-transparent bg-transparent",
      )}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <a href="#top" className="shrink-0" aria-label="My Buildy, back to top">
          <Image src="/images/buildy-logo.png" alt="My Buildy" width={122} height={32} loading="eager" className="h-8 w-auto" />
        </a>
        <div className="flex items-center gap-1 sm:gap-2">
          <ul className="hidden items-center md:flex">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="rounded-full px-4 py-2 text-small text-muted transition-colors hover:text-text">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href={REPO_URL}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-small font-bold text-text transition-colors hover:border-orange/60"
          >
            <GitHubMark className="size-4" />
            <span>GitHub</span>
            {stars !== null && (
              <span className="flex items-center gap-1 border-l border-line pl-2 text-muted">
                <Star className="size-3.5" aria-hidden="true" />
                <span className="sr-only">Stars:</span>
                {stars.toLocaleString("en-US")}
              </span>
            )}
          </a>
        </div>
      </nav>
    </header>
  );
}
