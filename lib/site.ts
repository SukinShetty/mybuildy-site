export const SITE_URL = "https://mybuildy.com";
export const REPO = "SukinShetty/mybuildy";
export const REPO_URL = `https://github.com/${REPO}`;
export const RELEASES_URL = `${REPO_URL}/releases/latest`;
export const README_URL = `${REPO_URL}#readme`;
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;

export const TITLE = "MyBuildy — your AI coding agent, finally explained";
export const DESCRIPTION =
  "A small orange robot that watches your AI coding agent’s window and tells you in plain English what just happened and what to type next. Free and source-available, for Windows and Mac.";

/** Downloads always go through mybuildy.com, never straight to GitHub (app/download/[platform]). */
export const downloadPath = (platform: "windows" | "mac-arm64" | "mac-x64") => `/download/${platform}`;
