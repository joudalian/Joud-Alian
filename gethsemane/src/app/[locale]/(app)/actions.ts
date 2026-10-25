"use server";

import { APIError } from "better-auth/api";
import { and, eq, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import type { FormState } from "@/components/forms/ActionForm";
import { SHIP_TO_COUNTRIES } from "@/config/store";
import { isLocale, type Locale } from "@/i18n/locales";
import { COUNTRY_CODES } from "@/lib/countries";
import { currentUser, getAuth, PASSWORD_MIN } from "@/server/auth";
import { backendStatus, getDb } from "@/server/db";
import { addresses } from "@/server/db/schema";
import { deleteAccountData } from "@/server/account";
import { readAddress } from "@/server/address";
import { orderForTracking } from "@/server/orders";
import { allow } from "@/server/rate-limit";

const str = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const localeOf = (data: FormData): Locale => {
  const l = str(data, "locale");
  return isLocale(l) ? l : "en";
};
/** Only same-site paths are accepted as a destination after logging in. */
const safeNext = (value: string, locale: Locale) => (/^\/[a-z]{2}\/[\w\-/]*$/.test(value) && !value.startsWith("//") ? value : `/${locale}/account`);

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(PASSWORD_MIN).max(128);

async function messages(locale: Locale) {
  return getTranslations({ locale, namespace: "auth" });
}

async function unavailable(locale: Locale): Promise<FormState | null> {
  if (!backendStatus()) return null;
  const t = await messages(locale);
  return { status: "error", message: t("unavailable") };
}

/* ---------- Sign up, log in, log out ---------- */

export async function signUp(_: FormState, data: FormData): Promise<FormState> {
  const locale = localeOf(data);
  const t = await messages(locale);
  const down = await unavailable(locale);
  if (down) return down;
  if (str(data, "website")) return { status: "success", message: t("signupSent") }; // honeypot
  const parsed = z.object({ name: z.string().trim().min(1).max(100), email, password }).safeParse({
    name: str(data, "name"),
    email: str(data, "email"),
    password: String(data.get("password") ?? ""),
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { status: "error", message: field === "password" ? t("passwordRule", { min: PASSWORD_MIN }) : field === "email" ? t("emailInvalid") : t("nameRequired") };
  }
  if (!(await allow("signup"))) return { status: "error", message: t("tooMany") };
  try {
    const auth = await getAuth();
    await auth.api.signUpEmail({
      body: { ...parsed.data, locale, callbackURL: `/${locale}/verify-email?status=verified` },
      headers: await headers(),
    });
  } catch (error) {
    // An existing address is answered exactly like a new one (no account enumeration); see onExistingUserSignUp.
    if (!(error instanceof APIError)) throw error;
    const code = (error.body as { code?: string } | undefined)?.code ?? "";
    if (/PASSWORD/.test(code)) return { status: "error", message: t("passwordRule", { min: PASSWORD_MIN }) };
  }
  return { status: "success", message: t("signupSent") };
}

export async function logIn(_: FormState, data: FormData): Promise<FormState> {
  const locale = localeOf(data);
  const t = await messages(locale);
  const down = await unavailable(locale);
  if (down) return down;
  const parsed = z.object({ email, password: z.string().min(1).max(128) }).safeParse({ email: str(data, "email"), password: String(data.get("password") ?? "") });
  if (!parsed.success) return { status: "error", message: t("loginFailed") };
  if (!(await allow("login", parsed.data.email))) return { status: "error", message: t("tooMany") };
  try {
    const auth = await getAuth();
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    const code = (error.body as { code?: string } | undefined)?.code ?? "";
    // Only reachable with the right password: a new verification link has just been sent.
    if (code === "EMAIL_NOT_VERIFIED") return { status: "error", message: t("notVerified") };
    return { status: "error", message: t("loginFailed") };
  }
  redirect(safeNext(str(data, "next"), locale));
}

export async function logOut(data: FormData) {
  const locale = localeOf(data);
  if (!backendStatus()) {
    const auth = await getAuth();
    await auth.api.signOut({ headers: await headers() }).catch(() => undefined);
  }
  redirect(`/${locale}`);
}

/* ---------- Passwords and verification ---------- */

export async function forgotPassword(_: FormState, data: FormData): Promise<FormState> {
  const locale = localeOf(data);
  const t = await messages(locale);
  const down = await unavailable(locale);
  if (down) return down;
  const parsed = email.safeParse(str(data, "email"));
  if (!parsed.success) return { status: "error", message: t("emailInvalid") };
  if (!(await allow("reset", parsed.data))) return { status: "error", message: t("tooMany") };
  const auth = await getAuth();
  // The same answer whether or not an account exists.
  await auth.api.requestPasswordReset({ body: { email: parsed.data, redirectTo: `/${locale}/reset-password` }, headers: await headers() }).catch(() => undefined);
  return { status: "success", message: t("resetSent") };
}

export async function resetPassword(_: FormState, data: FormData): Promise<FormState> {
  const locale = localeOf(data);
  const t = await messages(locale);
  const down = await unavailable(locale);
  if (down) return down;
  const newPassword = String(data.get("password") ?? "");
  if (!password.safeParse(newPassword).success) return { status: "error", message: t("passwordRule", { min: PASSWORD_MIN }) };
  if (newPassword !== String(data.get("confirm") ?? "")) return { status: "error", message: t("passwordMismatch") };
  if (!(await allow("reset"))) return { status: "error", message: t("tooMany") };
  try {
    const auth = await getAuth();
    await auth.api.resetPassword({ body: { newPassword, token: str(data, "token") }, headers: await headers() });
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    return { status: "error", message: t("resetInvalid") };
  }
  return { status: "success", message: t("resetDone") };
}

export async function resendVerification(_: FormState, data: FormData): Promise<FormState> {
  const locale = localeOf(data);
  const t = await messages(locale);
  const down = await unavailable(locale);
  if (down) return down;
  const parsed = email.safeParse(str(data, "email"));
  if (!parsed.success) return { status: "error", message: t("emailInvalid") };
  if (!(await allow("verify", parsed.data))) return { status: "error", message: t("tooMany") };
  const auth = await getAuth();
  await auth.api
    .sendVerificationEmail({ body: { email: parsed.data, callbackURL: `/${locale}/verify-email?status=verified` }, headers: await headers() })
    .catch(() => undefined);
  return { status: "success", message: t("verifySent") };
}

/* ---------- Order tracking ---------- */

export async function trackOrder(_: FormState, data: FormData): Promise<FormState> {
  const locale = localeOf(data);
  const t = await getTranslations({ locale, namespace: "track" });
  if (backendStatus()) return { status: "error", message: t("unavailable") };
  const number = str(data, "number");
  const address = email.safeParse(str(data, "email"));
  if (!number || !address.success) return { status: "error", message: t("notFound") };
  if (!(await allow("track"))) return { status: "error", message: t("tooMany") };
  const order = await orderForTracking(number, address.data);
  if (!order || order.status === "pending_payment") return { status: "error", message: t("notFound") };
  redirect(`/${locale}/track-order/${order.number}?key=${order.accessKey}`);
}

/* ---------- Account: profile, password, addresses, deletion ---------- */

async function requireUserFor(locale: Locale) {
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/account`);
  return user;
}

export async function updateProfile(_: FormState, data: FormData): Promise<FormState> {
  const locale = localeOf(data);
  const t = await getTranslations({ locale, namespace: "account" });
  await requireUserFor(locale);
  const name = z.string().trim().min(1).max(100).safeParse(str(data, "name"));
  const language = str(data, "language");
  if (!name.success || !isLocale(language)) return { status: "error", message: t("profileInvalid") };
  if (!(await allow("account"))) return { status: "error", message: t("tooMany") };
  const auth = await getAuth();
  await auth.api.updateUser({ body: { name: name.data, locale: language }, headers: await headers() });
  return { status: "success", message: t("profileSaved") };
}

export async function changePassword(_: FormState, data: FormData): Promise<FormState> {
  const locale = localeOf(data);
  const t = await getTranslations({ locale, namespace: "account" });
  const ta = await messages(locale);
  const user = await requireUserFor(locale);
  const newPassword = String(data.get("newPassword") ?? "");
  if (!password.safeParse(newPassword).success) return { status: "error", message: ta("passwordRule", { min: PASSWORD_MIN }) };
  if (newPassword !== String(data.get("confirm") ?? "")) return { status: "error", message: ta("passwordMismatch") };
  if (!(await allow("login", user.email))) return { status: "error", message: ta("tooMany") };
  try {
    const auth = await getAuth();
    const h = await headers();
    await auth.api.changePassword({ body: { currentPassword: String(data.get("currentPassword") ?? ""), newPassword }, headers: h });
    // Other devices are logged out; this one stays signed in.
    await auth.api.revokeOtherSessions({ headers: h });
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    return { status: "error", message: t("passwordWrong") };
  }
  return { status: "success", message: t("passwordChanged") };
}

export async function saveAddress(_: FormState, data: FormData): Promise<FormState> {
  const locale = localeOf(data);
  const t = await getTranslations({ locale, namespace: "account" });
  const user = await requireUserFor(locale);
  const parsed = readAddress(data);
  const allowed = SHIP_TO_COUNTRIES.length ? SHIP_TO_COUNTRIES : COUNTRY_CODES;
  if (!parsed.success || !allowed.includes(parsed.data.country)) return { status: "error", message: t("addressInvalid") };
  if (!(await allow("account"))) return { status: "error", message: t("tooMany") };
  const db = await getDb();
  const id = str(data, "id");
  const makeDefault = data.get("isDefault") === "on";
  if (makeDefault) await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
  if (id) {
    await db
      .update(addresses)
      .set({ ...parsed.data, isDefault: makeDefault })
      .where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
  } else {
    const existing = await db.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, user.id));
    if (existing.length >= 10) return { status: "error", message: t("addressLimit") };
    await db.insert(addresses).values({ ...parsed.data, userId: user.id, isDefault: makeDefault || existing.length === 0 });
  }
  redirect(`/${locale}/account/addresses?saved=1`);
}

export async function deleteAddress(data: FormData) {
  const locale = localeOf(data);
  const user = await requireUserFor(locale);
  const db = await getDb();
  await db.delete(addresses).where(and(eq(addresses.id, str(data, "id")), eq(addresses.userId, user.id)));
  redirect(`/${locale}/account/addresses`);
}

export async function makeDefaultAddress(data: FormData) {
  const locale = localeOf(data);
  const user = await requireUserFor(locale);
  const db = await getDb();
  const id = str(data, "id");
  await db.update(addresses).set({ isDefault: false }).where(and(eq(addresses.userId, user.id), ne(addresses.id, id)));
  await db.update(addresses).set({ isDefault: true }).where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
  redirect(`/${locale}/account/addresses`);
}

export async function deleteAccount(_: FormState, data: FormData): Promise<FormState> {
  const locale = localeOf(data);
  const t = await getTranslations({ locale, namespace: "account" });
  const user = await requireUserFor(locale);
  if (str(data, "confirm").toUpperCase() !== t("deleteWord").toUpperCase()) return { status: "error", message: t("deleteConfirmWrong", { word: t("deleteWord") }) };
  if (!(await allow("login", user.email))) return { status: "error", message: t("tooMany") };
  const auth = await getAuth();
  const ok = await auth.api
    .verifyPassword({ body: { password: String(data.get("password") ?? "") }, headers: await headers() })
    .then((r) => Boolean((r as { status?: boolean }).status ?? true))
    .catch(() => false);
  if (!ok) return { status: "error", message: t("passwordWrong") };
  await auth.api.signOut({ headers: await headers() }).catch(() => undefined);
  await deleteAccountData(user.id);
  redirect(`/${locale}/account/deleted`);
}
