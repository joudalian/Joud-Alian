import { expect, test, type Page } from "@playwright/test";
import { seedCart, simple } from "./catalog";
import { linkIn, sentEmails, uniqueEmail, useOwnIp, waitForEmail } from "./outbox";

// The owner area (/admin) and the contact form. ADMIN_EMAILS on the test server is owner@example.test.
test.skip(({ isMobile }) => isMobile, "run once (desktop)");
test.beforeEach(async ({ context }) => {
  await useOwnIp(context);
});

const ADMIN = "owner@example.test";
const PASSWORD = "olive-wood-2026";

async function signUpAndVerify(page: Page, email: string) {
  await page.goto("/en/signup");
  await page.getByLabel("Name").fill("Shop Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByTestId("signup-form-success")).toBeVisible();
  await page.goto(linkIn(await waitForEmail(email, "verify-email"), "/api/auth/verify-email"));
  await expect(page.getByTestId("verified")).toBeVisible();
}

/** Signs in as the owner (creating and verifying the account on first use in this test run). */
async function asAdmin(page: Page) {
  if (sentEmails(ADMIN, "verify-email").length === 0) await signUpAndVerify(page, ADMIN);
  await page.goto("/en/login");
  await page.getByLabel("Email").fill(ADMIN);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/en/account");
}

async function paidOrder(page: Page, email: string) {
  await seedCart(page, [{ slug: simple.slug, qty: 1 }]);
  await page.goto("/en/checkout");
  const form = page.getByTestId("checkout-form");
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Full name").fill("Anna Buyer");
  await form.getByLabel("Country").selectOption("DE");
  await form.getByLabel("Street and house number").fill("Olivenweg 7");
  await form.getByLabel("Postcode").fill("10115");
  await form.getByLabel("Town or city").fill("Berlin");
  await form.getByRole("checkbox", { name: /I have read the terms/ }).check();
  await expect(form.getByTestId("pay")).toBeEnabled();
  await form.getByTestId("pay").click();
  await page.getByRole("button", { name: "Pay" }).click();
  await expect(page.getByTestId("order-status")).toHaveText("Paid");
  return { number: (await page.getByTestId("order-number").textContent())!, confirmation: page.url() };
}

test.describe.configure({ mode: "serial" });

test("/admin is a 404 for visitors and customers, noindex for the owner", async ({ page, browser }) => {
  for (const path of ["/en/admin", "/en/admin/coupons", "/en/admin/orders/GTH-2601-0001"]) {
    expect((await page.goto(path))!.status(), path).toBe(404);
  }
  const customer = await browser.newPage();
  await useOwnIp(customer.context());
  await signUpAndVerify(customer, uniqueEmail("customer"));
  expect((await customer.goto("/en/admin"))!.status()).toBe(404);
  await customer.close();

  await asAdmin(page);
  const res = (await page.goto("/en/admin"))!;
  expect(res.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("heading", { level: 1, name: "Orders" })).toBeVisible();
});

test("owner: find an order, prepare it, ship it with tracking (email), add a private note", async ({ page, browser }) => {
  const buyer = uniqueEmail("ship");
  const shop = await browser.newPage();
  await useOwnIp(shop.context());
  const { number, confirmation } = await paidOrder(shop, buyer);

  await asAdmin(page);
  await page.goto(`/en/admin?q=${encodeURIComponent(buyer)}`);
  await expect(page.getByTestId("admin-orders").locator("tbody tr")).toHaveCount(1);
  await expect(page.getByTestId("admin-orders")).toContainText("TEST");
  await page.getByRole("link", { name: number }).click();
  await expect(page.getByTestId("admin-email")).toHaveText(buyer);

  // "paid" and "refunded" cannot be set by hand.
  const statuses = await page.locator("#f-status option").allTextContents();
  expect(statuses).not.toContain("paid");
  expect(statuses).not.toContain("refunded");
  await page.locator("#f-status").selectOption("processing");
  await page.getByRole("button", { name: "Set status" }).click();
  await expect(page.getByTestId("admin-status")).toContainText(`Status of ${number} updated.`);
  await expect(page.getByTestId("order-status")).toHaveText("Being prepared");

  await page.getByLabel("Carrier", { exact: true }).fill("Israel Post EMS");
  await page.getByLabel("Tracking number", { exact: true }).fill("EE123456789IL");
  await page.getByRole("button", { name: "Mark as shipped" }).click();
  await expect(page.getByTestId("admin-ship")).toContainText("the customer was emailed");
  const mail = await waitForEmail(buyer, "order-shipped");
  expect(mail.subject).toBe(`Your Gethsemane order ${number} has shipped`);
  expect(mail.text).toContain("EE123456789IL");
  expect(mail.text).toContain("Israel Post EMS");

  await page.getByLabel(/Internal note/).fill("Wrapped in extra tissue; customer asked for a quiet box.");
  await page.getByRole("button", { name: "Add internal note" }).click();
  await expect(page.getByTestId("admin-log")).toContainText("quiet box");

  // The customer sees the status and tracking, never the note.
  await shop.goto(confirmation);
  await expect(shop.getByTestId("order-status")).toHaveText("Shipped");
  await expect(shop.getByTestId("order-tracking")).toContainText("EE123456789IL");
  await expect(shop.locator("main")).not.toContainText("quiet box");
  await shop.close();
});

test("owner: coupons are created and disabled in admin and applied at checkout", async ({ page, browser }) => {
  await asAdmin(page);
  await page.goto("/en/admin/coupons");
  const code = `OLIVE${Date.now() % 100000}`;
  const form = page.getByTestId("admin-coupon-form");
  await form.getByLabel("Code").fill(code.toLowerCase());
  await form.getByLabel("Type").selectOption("percent");
  await form.getByLabel(/Amount/).fill("10");
  await form.getByRole("button", { name: "Create coupon" }).click();
  await expect(form).toContainText(`Coupon ${code} created.`);
  await expect(page.getByTestId("admin-coupons")).toContainText(code);
  // Bad input is refused by the server too (the browser's own pattern check is bypassed here).
  await form.getByLabel("Code").evaluate((el) => el.removeAttribute("pattern"));
  await form.getByLabel("Code").fill("x");
  await form.getByLabel(/Amount/).fill("10");
  await form.getByRole("button", { name: "Create coupon" }).click();
  await expect(form.locator(".form-error")).toContainText("Code: 3–40 letters");

  const shop = await browser.newPage();
  await useOwnIp(shop.context());
  await seedCart(shop, [{ slug: simple.slug, qty: 1 }]);
  await shop.goto("/en/checkout");
  await shop.getByLabel("Discount code").fill(code);
  await shop.getByRole("button", { name: "Apply" }).click();
  await expect(shop.getByTestId("coupon-message")).toContainText(code);
  await expect(shop.getByTestId("review-totals")).toContainText(`Discount (${code})`);

  await page.getByRole("button", { name: `Disable ${code}` }).click();
  await expect(page.getByRole("button", { name: `Enable ${code}` })).toBeVisible();
  await shop.reload();
  await shop.getByLabel("Discount code").fill(code);
  await shop.getByRole("button", { name: "Apply" }).click();
  await expect(shop.getByTestId("coupon-message")).toHaveText("This code is not valid.");
  await shop.close();
});

test("contact form: validation, honeypot, sends to the shop with Reply-To, rate limited", async ({ page }) => {
  await page.goto("/fr/contact?product=" + simple.slug);
  const form = page.getByTestId("contact-form");
  await expect(form.locator("#f-message")).toHaveValue(/^J'ai une question sur «\s.+\s»\s:\s$/);
  const email = uniqueEmail("visitor");
  await form.getByLabel("Votre nom").fill("Claire");
  await form.getByLabel("Votre e-mail").fill(email);
  await form.getByLabel(/Numéro de commande/).fill("gth-2611-0001");
  await form.locator("#f-message").fill("Bonjour, la crèche existe-t-elle en plus grand ?");
  await form.getByRole("button", { name: "Envoyer le message" }).click();
  await expect(page.getByTestId("contact-form-success")).toContainText("Votre message a été envoyé");
  const sent = sentEmails("gethsemane.t12@gmail.com", "contact").find((m) => m.text.includes(email))!;
  expect(sent.subject).toBe("[Gethsemane] Question about a piece — GTH-2611-0001 — Claire");
  expect((sent as unknown as { replyTo: string }).replyTo).toBe(email);
  expect(sent.text).toContain("Site language: fr");

  // A bot filling the hidden field gets the same answer, and nothing is sent.
  const before = sentEmails("gethsemane.t12@gmail.com", "contact").length;
  await page.goto("/en/contact");
  await page.locator("#f-website").fill("http://spam.example", { force: true });
  await page.getByLabel("Your name").fill("Bot");
  await page.getByLabel("Your email").fill(uniqueEmail("bot"));
  await page.locator("#f-message").fill("Buy cheap things now, now, now.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByTestId("contact-form-success")).toBeVisible();
  expect(sentEmails("gethsemane.t12@gmail.com", "contact")).toHaveLength(before);

  // Five messages per hour per connection.
  for (let i = 0; i < 5; i++) {
    await page.goto("/en/contact");
    await page.getByLabel("Your name").fill("Repeat");
    await page.getByLabel("Your email").fill(uniqueEmail("repeat"));
    await page.locator("#f-message").fill(`Message number ${i} for the rate limit.`);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator("[data-testid=contact-form-success], .form-error")).toBeVisible();
  }
  await expect(page.locator(".form-error")).toContainText("Too many messages");
});
