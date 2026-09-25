// The optional post-download questions: one source of truth for the options, shared by the
// form (components/download-guide.tsx) and the route that stores answers (app/api/signup).
// Dependency-free validation: anything that isn't exactly this shape is rejected.

export const BUILD_OPTIONS = [
  "A website or landing page",
  "A small app or tool for myself",
  "Something for my business",
  "Automating my own work",
  "Learning how to build",
  "Something else",
] as const;

export const AGENT_OPTIONS = [
  "Claude Code",
  "Codex CLI",
  "Gemini CLI",
  "Cursor",
  "Something else",
  "I haven't started yet",
] as const;

export const SELF_OPTIONS = [
  "I can't read code at all",
  "I can read a bit but not write it",
  "I'm a developer",
] as const;

export const PLATFORMS = ["windows", "mac-arm64", "mac-x64"] as const;
export type Platform = (typeof PLATFORMS)[number];

export type SignupPayload = {
  name: string;
  email: string;
  build: string[];
  agents: string[];
  self: string | null;
  platform: Platform;
};

const KEYS = ["name", "email", "build", "agents", "self", "platform"] as const;
const MAX_NAME = 80;
const MAX_EMAIL = 254;
// Deliberately loose: one @, something on both sides, a dot in the domain, no spaces.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isStringArrayOf = (v: unknown, allowed: readonly string[]): v is string[] =>
  Array.isArray(v) &&
  v.length <= allowed.length &&
  new Set(v).size === v.length &&
  v.every((x) => typeof x === "string" && allowed.includes(x));

/** Returns the payload if it is exactly the expected shape, otherwise null. */
export function parseSignup(body: unknown): SignupPayload | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const obj = body as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length !== KEYS.length || !KEYS.every((k) => keys.includes(k))) return null;

  const { name, email, build, agents, self, platform } = obj;
  if (typeof name !== "string" || name.length > MAX_NAME) return null;
  if (typeof email !== "string" || email.length > MAX_EMAIL) return null;
  if (email.trim() && !EMAIL_SHAPE.test(email.trim())) return null;
  if (!isStringArrayOf(build, BUILD_OPTIONS)) return null;
  if (!isStringArrayOf(agents, AGENT_OPTIONS)) return null;
  if (self !== null && (typeof self !== "string" || !(SELF_OPTIONS as readonly string[]).includes(self))) return null;
  if (typeof platform !== "string" || !(PLATFORMS as readonly string[]).includes(platform)) return null;

  return { name: name.trim(), email: email.trim(), build, agents, self: self as string | null, platform: platform as Platform };
}

/** True when nothing was answered — the form then just closes without sending anything. */
export function isBlank(p: Omit<SignupPayload, "platform">): boolean {
  return !p.name.trim() && !p.email.trim() && p.build.length === 0 && p.agents.length === 0 && p.self === null;
}
