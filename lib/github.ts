import { RELEASES_URL, REPO } from "@/lib/site";

export type DownloadAsset = { url: string; size: number };

export type Downloads = {
  /** Tag of the latest release, e.g. "v0.2.0". Undefined when the release could not be fetched. */
  version?: string;
  windows?: DownloadAsset;
  macArm?: DownloadAsset;
  macIntel?: DownloadAsset;
  /** Always safe to link to, whatever else failed. */
  fallbackUrl: string;
};

type GitHubAsset = { name: string; browser_download_url: string; size: number };
type GitHubRelease = { tag_name?: string; assets?: GitHubAsset[] };

const REVALIDATE = 3600;

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const pick = (assets: GitHubAsset[], suffix: string): DownloadAsset | undefined => {
  const a = assets.find((x) => x.name.toLowerCase().endsWith(suffix));
  return a ? { url: a.browser_download_url, size: a.size } : undefined;
};

export async function getDownloads(): Promise<Downloads> {
  const release = await getJson<GitHubRelease>(`https://api.github.com/repos/${REPO}/releases/latest`);
  const assets = release?.assets ?? [];
  return {
    version: assets.length ? release?.tag_name : undefined,
    windows: pick(assets, ".exe"),
    macArm: pick(assets, "-arm64.dmg"),
    macIntel: pick(assets, "-x64.dmg"),
    fallbackUrl: RELEASES_URL,
  };
}

export async function getStarCount(): Promise<number | null> {
  const repo = await getJson<{ stargazers_count?: number }>(`https://api.github.com/repos/${REPO}`);
  return typeof repo?.stargazers_count === "number" ? repo.stargazers_count : null;
}

export function formatSize(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}
