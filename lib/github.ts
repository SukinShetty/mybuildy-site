import { REPO } from "@/lib/site";
import type { Platform } from "@/lib/signup";

export type DownloadAsset = { url: string; size: number };

export type Downloads = {
  /** Tag of the latest release, e.g. "v0.2.0". Undefined when the release could not be fetched. */
  version?: string;
  windows?: DownloadAsset;
  macArm?: DownloadAsset;
  macIntel?: DownloadAsset;
};

type GitHubAsset = { name: string; browser_download_url: string; size: number };
type GitHubRelease = { tag_name?: string; assets?: GitHubAsset[] };

/** How long a release lookup may be served from cache. Downloads and the version line both follow it. */
export const RELEASE_REVALIDATE = 60;

// MYBUILDY_GITHUB_API exists only so tests can point this at a mock server.
const API = (process.env.MYBUILDY_GITHUB_API || "https://api.github.com").replace(/\/$/, "");

/** Which release file belongs to which platform, matched by suffix. */
export const ASSET_SUFFIX: Record<Platform, string> = {
  windows: ".exe",
  "mac-arm64": "-arm64.dmg",
  "mac-x64": "-x64.dmg",
};

async function getJson<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    // Optional read-only token: lifts GitHub's limit of 60 unauthenticated requests an hour.
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(`${API}${path}`, { headers, next: { revalidate }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** The latest published release (drafts and pre-releases excluded), or null. Cached up to 60 seconds. */
export async function getLatestRelease(): Promise<GitHubRelease | null> {
  return getJson<GitHubRelease>(`/repos/${REPO}/releases/latest`, RELEASE_REVALIDATE);
}

export function findAsset(release: GitHubRelease | null, platform: Platform): GitHubAsset | undefined {
  const suffix = ASSET_SUFFIX[platform];
  return release?.assets?.find((a) => a.name.toLowerCase().endsWith(suffix));
}

const toAsset = (a?: GitHubAsset): DownloadAsset | undefined => (a ? { url: a.browser_download_url, size: a.size } : undefined);

/** Version and sizes for the line under the download buttons. */
export async function getDownloads(): Promise<Downloads> {
  const release = await getLatestRelease();
  return {
    version: release?.assets?.length ? release.tag_name : undefined,
    windows: toAsset(findAsset(release, "windows")),
    macArm: toAsset(findAsset(release, "mac-arm64")),
    macIntel: toAsset(findAsset(release, "mac-x64")),
  };
}

export async function getStarCount(): Promise<number | null> {
  const repo = await getJson<{ stargazers_count?: number }>(`/repos/${REPO}`, 3600);
  return typeof repo?.stargazers_count === "number" ? repo.stargazers_count : null;
}

export function formatSize(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}
