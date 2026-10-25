"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/forms/ActionForm";
import { addInternalNote, createCoupon, setCouponActive, setOrderStatus, shipOrder } from "@/server/admin";
import { ORDER_STATUSES } from "@/server/db/schema";
import { requireAdmin } from "@/server/guards";

// The admin area is for the owner only and is written in English. Every action checks ADMIN_EMAILS again:
// a server action is a public endpoint, whatever page its form is on.

const str = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const denied: FormState = { status: "error", message: "Not allowed." };

const RESULT: Record<string, FormState> = {
  "not-found": { status: "error", message: "Order not found." },
  "not-allowed": { status: "error", message: "That change is not allowed for this order's current status." },
};

function done(number: string, result: string, message: string): FormState {
  if (result !== "ok") return RESULT[result] ?? denied;
  revalidatePath("/[locale]/admin", "layout");
  return { status: "success", message: message.replace("{number}", number) };
}

export async function updateStatus(_: FormState, data: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!admin) return denied;
  const number = str(data, "number");
  const status = z.enum(ORDER_STATUSES).safeParse(str(data, "status"));
  if (!status.success) return { status: "error", message: "Choose a status." };
  return done(number, await setOrderStatus(number, status.data, admin.email), `Status of {number} updated.`);
}

export async function markShipped(_: FormState, data: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!admin) return denied;
  const parsed = z
    .object({ number: z.string().min(1).max(40), carrier: z.string().min(1).max(80), tracking: z.string().min(1).max(120) })
    .safeParse({ number: str(data, "number"), carrier: str(data, "carrier"), tracking: str(data, "tracking") });
  if (!parsed.success) return { status: "error", message: "Enter the carrier and the tracking number." };
  const notify = data.get("notify") === "on";
  const result = await shipOrder(parsed.data.number, parsed.data.carrier, parsed.data.tracking, admin.email, notify);
  return done(parsed.data.number, result, notify ? "{number} marked as shipped; the customer was emailed." : "{number} marked as shipped (no email sent).");
}

export async function addNote(_: FormState, data: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!admin) return denied;
  const note = str(data, "note");
  if (!note || note.length > 2000) return { status: "error", message: "Write a note (up to 2000 characters)." };
  return done(str(data, "number"), await addInternalNote(str(data, "number"), note, admin.email), "Note added.");
}

const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,40}$/),
    kind: z.enum(["percent", "fixed"]),
    amount: z.coerce.number().positive(),
    minSubtotal: z.coerce.number().min(0).default(0),
    expiresAt: z.string().optional(),
    usageLimit: z.string().optional(),
  })
  .refine((c) => c.kind === "fixed" || (Number.isInteger(c.amount) && c.amount <= 100), { path: ["amount"] });

export async function addCoupon(_: FormState, data: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!admin) return denied;
  const parsed = couponSchema.safeParse({
    code: str(data, "code"),
    kind: str(data, "kind"),
    amount: str(data, "amount"),
    minSubtotal: str(data, "minSubtotal") || "0",
    expiresAt: str(data, "expiresAt") || undefined,
    usageLimit: str(data, "usageLimit") || undefined,
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return {
      status: "error",
      message:
        field === "code"
          ? "Code: 3–40 letters, digits, - or _."
          : field === "amount"
            ? "Amount: a percentage from 1 to 100, or a USD amount above 0."
            : "Check the fields.",
    };
  }
  const c = parsed.data;
  const expiresAt = c.expiresAt ? new Date(`${c.expiresAt}T23:59:59Z`) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return { status: "error", message: "Expiry: use a valid date." };
  const usageLimit = c.usageLimit ? Number(c.usageLimit) : null;
  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1)) return { status: "error", message: "Usage limit: a whole number of 1 or more, or empty." };
  const result = await createCoupon({
    code: c.code,
    kind: c.kind,
    amount: c.kind === "percent" ? c.amount : Math.round(c.amount * 100),
    minSubtotalCents: Math.round(c.minSubtotal * 100),
    expiresAt,
    usageLimit,
  });
  if (result === "exists") return { status: "error", message: "A coupon with this code already exists." };
  revalidatePath("/[locale]/admin/coupons", "page");
  return { status: "success", message: `Coupon ${c.code} created.` };
}

export async function toggleCoupon(data: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;
  const id = z.string().uuid().safeParse(str(data, "id"));
  if (!id.success) return;
  await setCouponActive(id.data, str(data, "active") === "true");
  revalidatePath("/[locale]/admin/coupons", "page");
}
