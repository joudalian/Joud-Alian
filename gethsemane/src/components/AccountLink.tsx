import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { UserIcon } from "./Icons";

/** Session cookie names (Better Auth, prefix "gethsemane"; "__Secure-" on HTTPS in production). */
const SESSION_COOKIES = ["__Secure-gethsemane.session_token", "gethsemane.session_token"];

/**
 * "Log in" or "Account" in the header. Only checks whether a session cookie is present (no database lookup on
 * marketing pages); the account pages verify the session for real.
 */
export async function AccountLink() {
  const t = await getTranslations("nav");
  const jar = await cookies();
  const signedIn = SESSION_COOKIES.some((name) => jar.has(name));
  const label = signedIn ? t("account") : t("login");
  return (
    <Link href={signedIn ? "/account" : "/login"} className="icon-btn account-link" aria-label={label} title={label} data-testid="account-link">
      <UserIcon size={22} />
    </Link>
  );
}
