"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { endSession, loginThrottled, passwordMatches, startSessionResult } from "@/lib/admin-auth";

export async function login(formData: FormData): Promise<void> {
  const attempt = formData.get("password");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  // Throttled attempts get the same answer as a wrong password.
  if (loginThrottled(ip) || typeof attempt !== "string" || !passwordMatches(attempt)) redirect("/admin?error=1");
  // Only reached with the right password, so naming the setup problem leaks nothing to guessers.
  const started = await startSessionResult();
  if (started === "missing-table") redirect("/admin?error=setup");
  if (started !== "ok") redirect("/admin?error=session");
  redirect("/admin");
}

export async function logout(): Promise<void> {
  if (!(await endSession())) redirect("/admin?error=logout");
  redirect("/admin");
}
