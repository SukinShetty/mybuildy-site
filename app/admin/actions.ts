"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { endSession, loginThrottled, passwordMatches, startSession } from "@/lib/admin-auth";

export async function login(formData: FormData): Promise<void> {
  const attempt = formData.get("password");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  // Throttled attempts get the same answer as a wrong password.
  if (loginThrottled(ip) || typeof attempt !== "string" || !passwordMatches(attempt)) redirect("/admin?error=1");
  await startSession();
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/admin");
}
