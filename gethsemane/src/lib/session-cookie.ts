/** Session cookie names (Better Auth, prefix "gethsemane"; "__Secure-" on HTTPS in production). */
const SESSION_COOKIES = ["__Secure-gethsemane.session_token", "gethsemane.session_token"];

/**
 * Whether a session cookie is present. A cheap hint for marketing pages (header link, wishlist sync), never a check
 * of the session itself: anything that reads or changes account data verifies the session on the server.
 */
export function hasSessionCookie(jar: { has(name: string): boolean }): boolean {
  return SESSION_COOKIES.some((name) => jar.has(name));
}
