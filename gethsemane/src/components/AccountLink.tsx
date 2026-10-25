import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { UserIcon } from "./Icons";

import { hasSessionCookie } from "@/lib/session-cookie";

/**
 * "Log in" or "Account" in the header. Only checks whether a session cookie is present (no database lookup on
 * marketing pages); the account pages verify the session for real.
 */
export async function AccountLink() {
  const t = await getTranslations("nav");
  const signedIn = hasSessionCookie(await cookies());
  const label = signedIn ? t("account") : t("login");
  return (
    <Link href={signedIn ? "/account" : "/login"} className="icon-btn account-link" aria-label={label} title={label} data-testid="account-link">
      <UserIcon size={22} />
    </Link>
  );
}
