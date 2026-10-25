"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import type { FormState } from "@/components/forms/ActionForm";
import { isLocale, type Locale } from "@/i18n/locales";
import { readAddress } from "@/server/address";
import { currentUser } from "@/server/auth";
import { createOrderAndSession } from "@/server/checkout";
import { dutiesNoteFor } from "@/lib/duties";
import { feature } from "@/server/features";
import { checkoutBlock } from "@/server/payments";
import { parseCartInput, quote, type Quote } from "@/server/pricing";
import { allow } from "@/server/rate-limit";

export type QuoteRequest = { locale: string; lines: unknown; country?: string; shippingMethod?: string; couponCode?: string; email?: string };

/** What the checkout page shows: the server's prices for the current cart, destination, method and code. */
export type QuoteView = {
  lines: { slug: string; name: string; variant: string | null; engraving: string | null; quantity: number; lineTotalCents: number }[];
  problems: string[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  shippingOptions: { id: string; label: string; cents: number }[];
  shippingMethod: string | null;
  coupon: string | null;
  couponMessage: string | null;
  countryAllowed: boolean;
  freeShipping: boolean;
  /** Confirmed import-duties note for the destination (FEATURES.dutiesNote), or null. */
  dutiesNote: string | null;
};

const localeOf = (value: unknown): Locale => (isLocale(value) ? value : "en");

async function view(q: Quote, locale: Locale, couponCode: string | undefined): Promise<QuoteView> {
  const t = await getTranslations({ locale, namespace: "checkout" });
  return {
    lines: q.lines.map((l) => ({ slug: l.slug, name: l.nameLocalized, variant: l.variantLabel, engraving: l.engraving, quantity: l.quantity, lineTotalCents: l.lineTotalCents })),
    problems: q.problems.map((p) => t(`problem.${p.reason}`, { slug: p.slug })),
    subtotalCents: q.subtotalCents,
    discountCents: q.discountCents,
    shippingCents: q.shippingCents,
    totalCents: q.totalCents,
    shippingOptions: q.shippingOptions.map((o) => ({ id: o.id, cents: o.cents, label: t("methodLabel", { method: t(`method.${o.id}`), min: o.days[0], max: o.days[1] }) })),
    shippingMethod: q.shippingMethod,
    coupon: q.coupon?.code ?? null,
    couponMessage: couponCode?.trim() ? (q.couponError ? t(`coupon.${q.couponError}`) : t("coupon.applied", { code: q.coupon?.code ?? "" })) : null,
    countryAllowed: q.countryAllowed,
    freeShipping: q.freeShipping,
    dutiesNote: feature("dutiesNote") ? dutiesNoteFor(q.region, locale) : null,
  };
}

export async function getQuote(request: QuoteRequest): Promise<QuoteView | null> {
  const locale = localeOf(request.locale);
  if (checkoutBlock()) return null;
  // Applying a coupon is rate limited (it is the one way to probe codes); plain re-quotes are cheap.
  if (request.couponCode?.trim() && !(await allow("coupon"))) {
    const q = await quote(parseCartInput(request.lines), { locale, country: request.country, shippingMethod: request.shippingMethod });
    const v = await view(q, locale, undefined);
    const t = await getTranslations({ locale, namespace: "checkout" });
    return { ...v, couponMessage: t("tooMany") };
  }
  const q = await quote(parseCartInput(request.lines), {
    locale,
    country: request.country,
    shippingMethod: request.shippingMethod,
    couponCode: request.couponCode,
    email: request.email,
  });
  return view(q, locale, request.couponCode);
}

const email = z.string().trim().toLowerCase().email().max(254);

export async function placeOrder(_: FormState, data: FormData): Promise<FormState> {
  const locale = localeOf(data.get("locale"));
  const t = await getTranslations({ locale, namespace: "checkout" });
  if (checkoutBlock()) return { status: "error", message: t("closed") };
  if (!(await allow("checkout"))) return { status: "error", message: t("tooMany") };
  const contact = email.safeParse(String(data.get("email") ?? ""));
  if (!contact.success) return { status: "error", message: t("emailInvalid") };
  const address = readAddress(data, "ship_");
  if (!address.success) return { status: "error", message: t("addressInvalid") };
  if (data.get("terms") !== "on") return { status: "error", message: t("termsRequired") };
  let lines: unknown;
  try {
    lines = JSON.parse(String(data.get("lines") ?? "[]"));
  } catch {
    lines = [];
  }
  // Engraved pieces cannot be returned: the buyer confirms the exact text once more (FEATURES.engravingPreview).
  const engraved = parseCartInput(lines).some((l) => l.engraving);
  if (engraved && feature("engravingPreview") && data.get("engravingConfirmed") !== "on") return { status: "error", message: t("engravingConfirmRequired") };
  const giftNote = data.get("gift") === "on" ? String(data.get("giftNote") ?? "").trim().slice(0, 500) : null;
  const couponCode = String(data.get("coupon") ?? "").trim().slice(0, 40);
  const q = await quote(parseCartInput(lines), {
    locale,
    country: address.data.country,
    shippingMethod: String(data.get("shippingMethod") ?? ""),
    couponCode,
    email: contact.data,
  });
  if (!q.lines.length) return { status: "error", message: t("empty") };
  if (q.problems.length) return { status: "error", message: t("cartChanged") };
  if (!q.countryAllowed || !q.shippingMethod) return { status: "error", message: t("countryNotShipped") };
  if (couponCode && !q.coupon) return { status: "error", message: t(`coupon.${q.couponError ?? "unknown"}`) };
  // The customer saw a total; if anything changed since (price, coupon), ask them to review it again.
  if (String(q.totalCents) !== String(data.get("expectedTotal") ?? "")) return { status: "error", message: t("totalChanged") };
  const user = await currentUser();
  let url: string;
  try {
    const method = q.shippingOptions.find((o) => o.id === q.shippingMethod)!;
    ({ url } = await createOrderAndSession({
      quote: q,
      email: contact.data,
      address: address.data,
      giftNote: giftNote || (data.get("gift") === "on" ? "" : null),
      locale,
      userId: user?.id ?? null,
      shippingLabel: t("methodLabel", { method: t(`method.${method.id}`), min: method.days[0], max: method.days[1] }),
    }));
  } catch (error) {
    console.error("[checkout] could not start payment:", error instanceof Error ? error.message : error);
    return { status: "error", message: t("paymentStartFailed") };
  }
  redirect(url);
}
