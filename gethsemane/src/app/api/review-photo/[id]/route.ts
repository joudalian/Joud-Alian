import { NextResponse } from "next/server";
import { feature } from "@/server/features";
import { requireAdmin } from "@/server/guards";
import { reviewPhoto } from "@/server/reviews";

/** A review photo (re-encoded WebP). Public once the review is approved; before that only for the owner. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!feature("reviews") || !/^[0-9a-f-]{36}$/.test(id)) return new NextResponse(null, { status: 404 });
  const row = await reviewPhoto(id);
  if (!row?.photo) return new NextResponse(null, { status: 404 });
  const approved = row.status === "approved";
  if (!approved && !(await requireAdmin())) return new NextResponse(null, { status: 404 });
  return new NextResponse(Buffer.from(row.photo, "base64"), {
    headers: { "Content-Type": "image/webp", "Cache-Control": approved ? "public, max-age=86400" : "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
