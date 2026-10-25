import { backendStatus } from "@/server/db";
import { paymentMode } from "@/server/payments";
import { getStripe } from "@/server/stripe";
import { handleStripeEvent } from "@/server/webhook";

// Stripe → us: payment results. Only requests with a valid Stripe signature (STRIPE_WEBHOOK_SECRET) are accepted.
// The order becomes "paid" here and nowhere else (not on the success page the customer returns to).
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (backendStatus() || paymentMode() === "off" || !secret) return new Response("Not configured", { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  const body = await request.text();
  let event;
  try {
    event = await getStripe().webhooks.constructEventAsync(body, signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  // Test-mode events are never applied to a live store (and the other way round).
  if (event.livemode !== (paymentMode() === "live")) return Response.json({ received: true, ignored: "mode" });
  try {
    const result = await handleStripeEvent(event);
    return Response.json({ received: true, result });
  } catch (error) {
    console.error("[stripe] webhook failed:", error instanceof Error ? error.message : error);
    // 500 makes Stripe retry later; the event was not recorded, so it will be handled then.
    return new Response("Error", { status: 500 });
  }
}
