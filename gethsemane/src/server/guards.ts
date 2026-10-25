import "server-only";
import { redirect } from "next/navigation";
import type { Locale } from "@/i18n/locales";
import { currentUser, isAdmin, type SessionUser } from "./auth";
import { backendStatus } from "./db";

/** For account pages: the signed-in user, or a redirect to the login page that comes back to `path` afterwards. */
export async function requirePageUser(locale: Locale, path: string): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}${path}`)}`);
  return user;
}

/** For /admin: owners only (ADMIN_EMAILS). Everyone else gets a 404, so the page's existence is not revealed. */
export async function requireAdmin(): Promise<SessionUser | null> {
  if (backendStatus()) return null;
  const user = await currentUser();
  return isAdmin(user) ? user : null;
}
