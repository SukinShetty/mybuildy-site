// Resolves a platform to a URL that serves the installer file itself, for /download/[platform].

import "server-only";
import { findAsset, getLatestRelease } from "@/lib/github";
import type { Platform } from "@/lib/signup";

/**
 * The URL of the file for `platform` in the latest published release, or null if there isn't one.
 *
 * The release listing can be up to 60 seconds old, so the file is checked before anyone is sent
 * there: GitHub's download link answers with a redirect to the file itself when the file exists,
 * and with a 404 page when it doesn't. The visitor goes to the file, never to a GitHub page.
 */
export async function resolveDownload(platform: Platform): Promise<string | null> {
  const asset = findAsset(await getLatestRelease(), platform);
  if (!asset) return null;
  try {
    const res = await fetch(asset.browser_download_url, {
      method: "HEAD",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      return location ? new URL(location, asset.browser_download_url).toString() : null;
    }
    // Served directly, without a redirect: the link itself is the file.
    if (res.ok) return asset.browser_download_url;
    return null;
  } catch {
    return null;
  }
}
