// Download counts per release, for /admin. Public GitHub API, no token.

import "server-only";
import { REPO } from "@/lib/site";

export type ReleaseStats = {
  tag: string;
  name: string;
  publishedAt: string | null;
  url: string;
  windows: number;
  macArm: number;
  macIntel: number;
  total: number;
};

type GitHubAsset = { name: string; download_count: number };
type GitHubRelease = {
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string | null;
  draft: boolean;
  assets: GitHubAsset[];
};

const count = (assets: GitHubAsset[], suffix: string) =>
  assets.filter((a) => a.name.toLowerCase().endsWith(suffix)).reduce((n, a) => n + a.download_count, 0);

/**
 * Every published release, newest first, or null if GitHub could not be reached.
 * Cached for five minutes: the unauthenticated API allows 60 requests an hour per IP.
 */
export async function getReleaseStats(): Promise<ReleaseStats[] | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const releases = (await res.json()) as GitHubRelease[];
    return releases
      .filter((r) => !r.draft)
      .map((r) => {
        const windows = count(r.assets, ".exe");
        const macArm = count(r.assets, "-arm64.dmg");
        const macIntel = count(r.assets, "-x64.dmg");
        return {
          tag: r.tag_name,
          name: r.name || r.tag_name,
          publishedAt: r.published_at,
          url: r.html_url,
          windows,
          macArm,
          macIntel,
          total: windows + macArm + macIntel,
        };
      });
  } catch {
    return null;
  }
}
