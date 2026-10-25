import "server-only";
import { hash, verify } from "@node-rs/argon2";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { siteUrl } from "@/lib/site";
import { getDb } from "./db";
import * as schema from "./db/schema";
import { sendExistingAccountEmail, sendPasswordResetEmail, sendVerificationEmail } from "./email/account-emails";

/** OWASP-recommended argon2id parameters (19 MiB, 2 iterations). */
const ARGON2 = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;
export const PASSWORD_MIN = 10;
export const COOKIE_PREFIX = "gethsemane";

async function createAuth() {
  const db = await getDb();
  const secret = process.env.BETTER_AUTH_SECRET ?? (process.env.NODE_ENV === "production" ? undefined : "development-only-secret-not-for-production-use");
  return betterAuth({
    appName: "Gethsemane",
    baseURL: siteUrl,
    secret,
    trustedOrigins: [siteUrl],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
    }),
    user: {
      additionalFields: { locale: { type: "string", required: false, defaultValue: "en", input: true } },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: PASSWORD_MIN,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      // Hashing through the library's hook, with a maintained argon2id implementation (no home-made crypto).
      password: {
        hash: (password) => hash(password, ARGON2),
        verify: ({ hash: stored, password }) => verify(stored, password),
      },
      sendResetPassword: async ({ user, url }) => {
        await sendPasswordResetEmail(user, url);
      },
      // Signing up with a known address answers like a new sign-up and emails the owner of the address instead.
      onExistingUserSignUp: async ({ user }) => {
        const locale = (user as { locale?: string }).locale ?? "en";
        await sendExistingAccountEmail(user, `${siteUrl}/${locale}/login`, `${siteUrl}/${locale}/forgot-password`);
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 24 * 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        await sendVerificationEmail(user, url);
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 14, updateAge: 60 * 60 * 24 },
    // Better Auth's own limiter guards its HTTP endpoints (email links); the forms use src/server/rate-limit.ts.
    rateLimit: { enabled: true, storage: "memory", window: 60, max: 30 },
    advanced: {
      cookiePrefix: COOKIE_PREFIX,
      useSecureCookies: process.env.NODE_ENV === "production",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
      // Sessions store no IP address (see the privacy page); our own rate limits use hashed IPs.
      ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"], disableIpTracking: true },
    },
    telemetry: { enabled: false },
    plugins: [nextCookies()],
  });
}

type Auth = Awaited<ReturnType<typeof createAuth>>;
const globalForAuth = globalThis as unknown as { gethsemaneAuth?: Promise<Auth> };

export function getAuth(): Promise<Auth> {
  globalForAuth.gethsemaneAuth ??= createAuth();
  return globalForAuth.gethsemaneAuth;
}

export type SessionUser = { id: string; email: string; name: string; emailVerified: boolean; locale: string };

/** The signed-in user, or null. Reads the session cookie of the current request. */
export async function currentUser(): Promise<SessionUser | null> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as typeof session.user & { locale?: string };
  return { id: u.id, email: u.email, name: u.name, emailVerified: u.emailVerified, locale: u.locale ?? "en" };
}

/** Owner accounts: ADMIN_EMAILS (comma-separated) in the environment, and only with a verified email. */
export function isAdmin(user: SessionUser | null): boolean {
  if (!user?.emailVerified) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(user.email.toLowerCase());
}
