// GET /download/windows | /download/mac-arm64 | /download/mac-x64
// Looks up the latest release (cached at most 60 seconds) and redirects straight to the file. If
// the file isn't there or GitHub can't be reached, the visitor gets a friendly page on
// mybuildy.com instead. Never redirects to a GitHub page.

import { NextResponse } from "next/server";
import { resolveDownload } from "@/lib/download";
import { PLATFORMS, type Platform } from "@/lib/signup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isPlatform = (p: string): p is Platform => (PLATFORMS as readonly string[]).includes(p);

export async function GET(req: Request, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  if (!isPlatform(platform)) return new Response("Not found", { status: 404 });

  const file = await resolveDownload(platform);
  const target = file ?? new URL(`/download/unavailable?platform=${platform}`, req.url).toString();
  const res = NextResponse.redirect(target, 302);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex");
  return res;
}
