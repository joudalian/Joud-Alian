"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";
import type { FormState } from "@/components/forms/ActionForm";
import { isLocale, type Locale } from "@/i18n/locales";
import { getDb } from "@/server/db";
import { reviews } from "@/server/db/schema";
import { feature } from "@/server/features";
import { allow } from "@/server/rate-limit";
import { optOutOfReviews, reviewContext } from "@/server/reviews";

const str = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const schema = z.object({
  product: z.string().min(1).max(80),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().min(10).max(2000),
  displayName: z.string().min(1).max(40),
});

/** Re-encodes an uploaded photo: orientation applied, at most 1200 px, WebP, all metadata (EXIF, GPS) dropped. */
async function reencode(file: File): Promise<string | null> {
  const sharp = (await import("sharp")).default;
  const input = Buffer.from(await file.arrayBuffer());
  const output = await sharp(input, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  return output.toString("base64");
}

/** A verified buyer's review: the token in the emailed link proves the order; it waits for moderation. */
export async function submitReview(_: FormState, data: FormData): Promise<FormState> {
  const raw = str(data, "locale");
  const locale: Locale = isLocale(raw) ? raw : "en";
  const t = await getTranslations({ locale, namespace: "reviews" });
  if (!feature("reviews")) return { status: "error", message: t("closed") };
  const context = await reviewContext(str(data, "token"));
  if (!context) return { status: "error", message: t("invalidLink") };
  const parsed = schema.safeParse({ product: str(data, "product"), rating: str(data, "rating"), body: str(data, "body"), displayName: str(data, "displayName") });
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    return { status: "error", message: t.has(`invalid.${field}`) ? t(`invalid.${field}`) : t("check") };
  }
  const r = parsed.data;
  if (!context.products.some((p) => p.slug === r.product)) return { status: "error", message: t("check") };
  if (context.reviewed.has(r.product)) return { status: "error", message: t("already") };
  if (!(await allow("review"))) return { status: "error", message: t("tooMany") };
  let photo: string | null = null;
  const file = data.get("photo");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PHOTO_BYTES || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { status: "error", message: t("invalid.photo") };
    try {
      photo = await reencode(file);
    } catch {
      return { status: "error", message: t("invalid.photo") };
    }
  }
  const db = await getDb();
  const [saved] = await db
    .insert(reviews)
    .values({ orderId: context.order.id, productSlug: r.product, rating: r.rating, body: r.body, displayName: r.displayName, locale, photo })
    .onConflictDoNothing()
    .returning({ id: reviews.id });
  if (!saved) return { status: "error", message: t("already") };
  return { status: "success", message: t("thanks") };
}

export async function optOut(_: FormState, data: FormData): Promise<FormState> {
  const raw = str(data, "locale");
  const locale: Locale = isLocale(raw) ? raw : "en";
  const t = await getTranslations({ locale, namespace: "reviews" });
  return (await optOutOfReviews(str(data, "token"))) ? { status: "success", message: t("optedOut") } : { status: "error", message: t("invalidLink") };
}
