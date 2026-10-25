import { expect, test, type Page } from "@playwright/test";
import Stripe from "stripe";
import { SHIPPING_RATES } from "../src/config/store";
import { fixture, nameOf, price, priceOf, seedCart, simple } from "./catalog";
import { sentEmails, uniqueEmail, useOwnIp, waitForEmail } from "./outbox";

// Checkout with Stripe in TEST mode against the local stand-in (scripts/stripe-mock.mjs): its "hosted payment
// page" sends signed webhooks to the site exactly like Stripe. The second test server (port 3101) has no keys.
test.skip(({ isMobile }) => isMobile, "run once (desktop)");
test.beforeEach(async ({ context }) => {
  await useOwnIp(context);
});

const WEBHOOK_SECRET = "whsec_test_local_stand_in_only"; // the test server's placeholder (scripts/test-server.mjs)
const STRIPE_STAND_IN = "http://localhost:12100";
const signer = new Stripe("sk_test_unused");
const usd = (cents: number) => price(cents / 100);
const europeStandard = SHIPPING_RATES.europe.find((r) => r.id === "standard")!.usd * 100;

async function sendWebhook(request: Page["request"], type: string, object: Record<string, unknown>, id = `evt_test_${Date.now()}_${Math.random().toString(36).slice(2)}`) {
  const payload = JSON.stringify({ id, object: "event", type, livemode: false, created: Math.floor(Date.now() / 1000), data: { object } });
  const header = signer.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  return request.post("/api/stripe/webhook", { data: payload, headers: { "Content-Type": "application/json", "Stripe-Signature": header } });
}

async function fillCheckout(page: Page, email: string) {
  await page.goto("/en/checkout");
  const form = page.getByTestId("checkout-form");
  await expect(page.getByTestId("test-mode")).toContainText("4242 4242 4242 4242");
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Full name").fill("Anna Buyer");
  await form.getByLabel("Country").selectOption("DE");
  await form.getByLabel("Street and house number").fill("Olivenweg 7");
  await form.getByLabel("Postcode").fill("10115");
  await form.getByLabel("Town or city").fill("Berlin");
  await expect(form.getByRole("radio", { name: /Standard/ })).toBeChecked();
  return form;
}

test("full purchase: checkout, payment page, webhook, confirmation, email, empty cart, tracking", async ({ page }) => {
  const email = uniqueEmail("buyer");
  await seedCart(page, [{ slug: simple.slug, qty: 2 }]);
  const form = await fillCheckout(page, email);
  const itemsCents = Math.round(priceOf(simple) * 100) * 2;
  await expect(page.getByTestId("review-total")).toHaveText(usd(itemsCents + europeStandard));
  await expect(page.getByText("You will be charged in US dollars (USD).")).toBeVisible();
  // Live-only wording never appears in test mode.
  await expect(page.getByText(/processed by Stripe/)).toHaveCount(0);
  await expect(form.getByTestId("pay")).toHaveText("Order and pay");
  await form.getByTestId("pay").click();
  await expect(page.getByRole("checkbox", { name: /I have read the terms/ })).toBeFocused();
  await form.getByRole("checkbox", { name: /I have read the terms/ }).check();
  await form.getByTestId("pay").click();

  // The stand-in's payment page charges exactly the server's total.
  await expect(page).toHaveURL(/localhost:12100\/pay\/cs_test_/);
  await expect(page.locator("#amount")).toHaveText(String(itemsCents + europeStandard));
  await page.getByRole("button", { name: "Pay" }).click();

  await expect(page).toHaveURL(/\/en\/order\/GTH-\d{4}-\d{4}\/confirmation\?key=/);
  await expect(page.getByTestId("thanks")).toContainText(email);
  await expect(page.getByTestId("order-status")).toHaveText("Paid");
  await expect(page.getByText("Test order: placed in payment test mode")).toBeVisible();
  const number = (await page.getByTestId("order-number").textContent())!;
  expect(number).toMatch(/^GTH-\d{4}-\d{4}$/);

  const mail = await waitForEmail(email, "order-confirmation");
  expect(mail.subject).toBe(`Your Gethsemane order ${number}`);
  expect(mail.text).toContain(`2 × ${nameOf(simple)}`);
  expect(mail.text).toContain(usd(itemsCents + europeStandard));

  // The order is emptied in this browser.
  await page.goto("/en/cart");
  await expect(page.getByRole("heading", { name: "Your order is empty." })).toBeVisible();

  // Guest tracking with the number and email finds it.
  await page.goto("/en/track-order");
  await page.getByLabel("Order number").fill(number.toLowerCase());
  await page.getByLabel("Email").fill(email.toUpperCase());
  await page.getByRole("button", { name: "Track order" }).click();
  await expect(page.getByTestId("order-status")).toHaveText("Paid");
  await expect(page.getByTestId("order-details")).toContainText("Olivenweg 7");
});

test("variant and engraving are priced on the server and travel to the order", async ({ page }) => {
  const variant = fixture.variants.at(-1)!;
  await seedCart(page, [{ slug: fixture.slug, qty: 1, variantId: variant.id, engraving: "Anna" }]);
  await fillCheckout(page, uniqueEmail("engraved"));
  const unit = Math.round(priceOf(fixture, variant.id, true) * 100);
  await expect(page.getByTestId("review-lines")).toContainText(`Engraving: “Anna”`);
  await expect(page.getByTestId("review-total")).toHaveText(usd(unit + europeStandard));
  await page.getByRole("radio", { name: /Express/ }).check();
  const express = SHIPPING_RATES.europe.find((r) => r.id === "express")!.usd * 100;
  await expect(page.getByTestId("review-total")).toHaveText(usd(unit + express));
});

test("the browser cannot change prices: tampered totals, engravings and variants are refused", async ({ page }) => {
  await seedCart(page, [{ slug: simple.slug, qty: 1 }]);
  const form = await fillCheckout(page, uniqueEmail("tamper"));
  await form.getByRole("checkbox", { name: /I have read the terms/ }).check();
  await expect(form.getByTestId("pay")).toBeEnabled();
  // A total the server did not compute.
  await page.locator('input[name="expectedTotal"]').evaluate((el: HTMLInputElement) => (el.value = "100"));
  await form.getByTestId("pay").click();
  await expect(form.locator(".form-error")).toContainText("The total has changed");
  await expect(page).toHaveURL(/\/en\/checkout/);

  // An engraving longer than allowed, and a variant that does not exist.
  await seedCart(page, [{ slug: fixture.slug, qty: 1, variantId: fixture.variants[0]!.id, engraving: "x".repeat(fixture.engraving!.maxChars + 5) }]);
  await fillCheckout(page, uniqueEmail("tamper2"));
  await expect(page.getByTestId("checkout-form").locator(".form-error").first()).toContainText("engraving");
  await expect(page.getByTestId("pay")).toBeDisabled();
  await seedCart(page, [{ slug: fixture.slug, qty: 1, variantId: "no-such-size" }]);
  await fillCheckout(page, uniqueEmail("tamper3"));
  await expect(page.getByTestId("checkout-form").locator(".form-error").first()).toContainText("choose the size");
  await expect(page.getByTestId("pay")).toBeDisabled();
});

test("an unknown discount code is refused with a clear message", async ({ page }) => {
  await seedCart(page, [{ slug: simple.slug, qty: 1 }]);
  await fillCheckout(page, uniqueEmail("coupon"));
  await page.getByLabel("Discount code").fill("NOPE10");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByTestId("coupon-message")).toHaveText("This code is not valid.");
});

test("the success page never marks an order paid; expiry cancels it; cancel keeps the cart", async ({ page, request }) => {
  await seedCart(page, [{ slug: simple.slug, qty: 1 }]);
  const form = await fillCheckout(page, uniqueEmail("unpaid"));
  await form.getByRole("checkbox", { name: /I have read the terms/ }).check();
  await form.getByTestId("pay").click();
  await expect(page).toHaveURL(/localhost:12100\/pay\//);
  const sessionId = page.url().split("/pay/")[1]!;
  const session = ((await (await request.get(`${STRIPE_STAND_IN}/__sessions`)).json()) as { id: string; success_url: string }[]).find((s) => s.id === sessionId)!;

  // Opening the success URL without paying: still awaiting payment.
  await page.goto(session.success_url);
  await expect(page.getByTestId("confirming")).toBeVisible();
  await expect(page.getByTestId("order-status")).toHaveText("Awaiting payment");

  // Back to the shop from the payment page: the cart is kept... (the confirmation page above cleared it, so seed again)
  await seedCart(page, [{ slug: simple.slug, qty: 1 }]);
  const form2 = await fillCheckout(page, uniqueEmail("cancel"));
  await form2.getByRole("checkbox", { name: /I have read the terms/ }).check();
  await form2.getByTestId("pay").click();
  await page.getByRole("button", { name: "Back to the shop" }).click();
  await expect(page).toHaveURL(/\/en\/checkout\?cancelled=1/);
  await expect(page.getByTestId("checkout-cancelled")).toBeVisible();
  await expect(page.getByTestId("review-lines")).toContainText(nameOf(simple));

  // Stripe expires the first session: the order is cancelled.
  await request.post(`${STRIPE_STAND_IN}/pay/${sessionId}/expire`);
  await page.goto(session.success_url);
  await expect(page.getByTestId("order-status")).toHaveText("Cancelled");
});

test("webhook: bad signatures are rejected, duplicates are ignored, refunds update the order", async ({ page, request }) => {
  const bad = await request.post("/api/stripe/webhook", { data: "{}", headers: { "Stripe-Signature": "t=1,v1=deadbeef" } });
  expect(bad.status()).toBe(400);
  expect((await request.post("/api/stripe/webhook", { data: "{}" })).status()).toBe(400);

  // A paid order.
  const email = uniqueEmail("refund");
  await seedCart(page, [{ slug: simple.slug, qty: 1 }]);
  const form = await fillCheckout(page, email);
  await form.getByRole("checkbox", { name: /I have read the terms/ }).check();
  await form.getByTestId("pay").click();
  await expect(page).toHaveURL(/localhost:12100\/pay\//);
  const sessionId = page.url().split("/pay/")[1]!;
  await page.getByRole("button", { name: "Pay" }).click();
  await expect(page.getByTestId("order-status")).toHaveText("Paid");
  const confirmation = page.url();
  const session = ((await (await request.get(`${STRIPE_STAND_IN}/__sessions`)).json()) as (Record<string, unknown> & { id: string })[]).find((s) => s.id === sessionId)!;

  // The same completed event delivered twice more (new id once, same id again): one "Payment received", one email.
  const replay = { ...session, payment_status: "paid" };
  const first = await sendWebhook(request, "checkout.session.completed", replay, "evt_test_replay_1");
  expect((await first.json()).result).toBe("processed");
  const second = await sendWebhook(request, "checkout.session.completed", replay, "evt_test_replay_1");
  expect((await second.json()).result).toBe("duplicate");
  await page.goto(confirmation);
  await expect(page.locator(".order-history li", { hasText: "Payment received" })).toHaveCount(1);
  expect(sentEmails(email, "order-confirmation")).toHaveLength(1);

  // A full refund from the Stripe dashboard arrives as charge.refunded.
  const total = session.amount_total as number;
  const refunded = await sendWebhook(request, "charge.refunded", {
    id: "ch_test_1",
    object: "charge",
    amount: total,
    amount_refunded: total,
    payment_intent: session.payment_intent,
    metadata: session.metadata,
  });
  expect((await refunded.json()).result).toBe("processed");
  await page.reload();
  await expect(page.getByTestId("order-status")).toHaveText("Refunded");
});

test("Buy now on a product page goes straight to checkout with that piece", async ({ page }) => {
  await page.goto(`/en/product/${simple.slug}`);
  await page.getByTestId("buy-now").click();
  await expect(page).toHaveURL(/\/en\/checkout$/);
  await expect(page.getByTestId("review-lines")).toContainText(nameOf(simple));
});

test.describe("without payment keys", () => {
  const OFF = "http://localhost:3101";
  test("checkout and cart say payments are opening soon, with the contact email and page", async ({ page }) => {
    await page.goto(`${OFF}/en/checkout`);
    const notice = page.getByTestId("payments-soon");
    await expect(notice).toContainText("Payments are opening soon");
    await expect(notice.locator('a[href="mailto:gethsemane.t12@gmail.com"]')).toBeVisible();
    await expect(notice.getByRole("link", { name: "Contact page" })).toHaveAttribute("href", "/en/contact");
    await page.evaluate((slug) => localStorage.setItem("gethsemane.cart.v2", JSON.stringify([{ slug, qty: 1 }])), simple.slug);
    await page.goto(`${OFF}/en/cart`);
    await expect(page.getByTestId("payments-soon")).toBeVisible();
    await expect(page.getByTestId("to-checkout")).toHaveCount(0);
    await page.goto(`${OFF}/en/product/${simple.slug}`);
    await expect(page.getByTestId("buy-now")).toHaveCount(0);
    // No card logos or payment-brand wording anywhere on these pages.
    for (const path of ["/en/checkout", "/en/cart"]) {
      await page.goto(`${OFF}${path}`);
      await expect(page.locator("body")).not.toContainText(/stripe|visa|mastercard|apple pay|google pay/i);
    }
    expect((await page.request.post(`${OFF}/api/stripe/webhook`, { data: "{}" })).status()).toBe(503);
  });
});
