// Display and export helpers for /admin.

import type { SignupRow } from "@/lib/supabase";

// Dates are shown in India time, where the site is run from.
const TIME_ZONE = "Asia/Kolkata";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TIME_ZONE,
});

/** e.g. "25 Sep 2026, 14:03 IST" */
export function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${dateFormat.format(d)} IST`;
}

export const PLATFORM_LABELS: Record<string, string> = {
  windows: "Windows",
  "mac-arm64": "Mac (Apple Silicon)",
  "mac-x64": "Mac (Intel)",
};

export const platformLabel = (p: string) => PLATFORM_LABELS[p] ?? p;

/** Count each option across rows, highest first; ties keep the form's option order. */
export function tally(options: readonly string[], picks: (string | null | string[])[]): { option: string; count: number }[] {
  const counts = new Map(options.map((o) => [o, 0]));
  for (const p of picks) for (const v of Array.isArray(p) ? p : p ? [p] : []) if (counts.has(v)) counts.set(v, counts.get(v)! + 1);
  return options.map((option) => ({ option, count: counts.get(option)! })).sort((a, b) => b.count - a.count);
}

// CSV: RFC 4180 quoting, plus a leading apostrophe on anything a spreadsheet would run as a
// formula (answers are typed by the public).
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function signupsToCsv(rows: SignupRow[]): string {
  const header = ["created_at", "name", "email", "platform", "building", "agents", "skill_level", "id"];
  const lines = rows.map((r) =>
    [
      r.created_at,
      r.name ?? "",
      r.email ?? "",
      r.platform,
      (r.building ?? []).join("; "),
      (r.agents ?? []).join("; "),
      r.skill_level ?? "",
      r.id,
    ]
      .map(cell)
      .join(","),
  );
  // Byte-order mark so Excel reads it as UTF-8.
  return "﻿" + [header.join(","), ...lines].join("\r\n") + "\r\n";
}
