// Shown by /download/[platform] when the installer can't be found or GitHub can't be reached.

import type { Metadata } from "next";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { downloadPath } from "@/lib/site";
import { PLATFORMS, type Platform } from "@/lib/signup";

export const metadata: Metadata = {
  title: "Download being updated — MyBuildy",
  robots: { index: false, follow: false },
};

const isPlatform = (p: unknown): p is Platform => typeof p === "string" && (PLATFORMS as readonly string[]).includes(p);

export default async function DownloadUnavailable({ searchParams }: { searchParams: Promise<{ platform?: string }> }) {
  const { platform } = await searchParams;

  return (
    <main id="main" className="mx-auto flex min-h-svh max-w-[40rem] flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="text-section font-bold tracking-[-0.02em]">The download is being updated</h1>
      <p className="mt-5 text-body text-text/90">
        The download is being updated — please try again in a few minutes.
      </p>
      <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Plain anchors: the download route redirects to a file, so it must not be prefetched. */}
        {isPlatform(platform) && (
          <a
            href={downloadPath(platform)}
            className="inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-orange px-7 text-body font-bold text-ink transition-colors duration-200 hover:bg-amber"
          >
            <RotateCw className="size-5" aria-hidden="true" />
            Try again
          </a>
        )}
        <Link
          href="/"
          className="inline-flex h-14 items-center justify-center rounded-full border border-line bg-surface px-7 text-body font-bold text-text transition-colors duration-200 hover:border-orange/60"
        >
          Back to MyBuildy
        </Link>
      </div>
    </main>
  );
}
