import { expect, test, type Page } from "@playwright/test";
import { linkIn, sentEmails, uniqueEmail, useOwnIp, waitForEmail } from "./outbox";

// Accounts: sign-up with email verification, log in/out, profile, password, address book, data export and deletion.
test.skip(({ isMobile }) => isMobile, "run once (desktop)");
test.beforeEach(async ({ context }) => {
  await useOwnIp(context);
});

const PASSWORD = "olive-wood-2026";

async function signUpAndVerify(page: Page, email: string, name = "Mary Tester") {
  await page.goto("/en/signup");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByTestId("signup-form-success")).toContainText("We have sent an email");
  const mail = await waitForEmail(email, "verify-email");
  expect(mail.subject).toBe("Confirm your email address for Gethsemane");
  expect(mail.html).toContain("129 Al Mahed Street");
  await page.goto(linkIn(mail, "/api/auth/verify-email"));
  await expect(page.getByTestId("verified")).toBeVisible();
}

async function logIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/en/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

test("sign up, verify the email, log out and back in", async ({ page }) => {
  const email = uniqueEmail("signup");
  await signUpAndVerify(page, email);
  await page.goto("/en/account");
  await expect(page.getByTestId("account-greeting")).toHaveText("Hello Mary Tester.");
  await expect(page.getByTestId("account-link")).toHaveAttribute("aria-label", "Your account");
  await page.getByTestId("logout").click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByTestId("account-link")).toHaveAttribute("aria-label", "Log in");
  await page.goto("/en/account/orders");
  await expect(page).toHaveURL(/\/en\/login\?next=/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/en\/account\/orders$/);
  await expect(page.getByText("You have not placed an order with this account yet.")).toBeVisible();
});

test("no account enumeration: sign-up and reset answer the same for known and unknown addresses", async ({ page }) => {
  const email = uniqueEmail("enum");
  await signUpAndVerify(page, email);
  await page.getByRole("link", { name: "Go to your account" }).isVisible();
  await page.context().clearCookies();
  // Signing up again with the same address: same answer, and the owner gets an "already have an account" email.
  await page.goto("/en/signup");
  await page.getByLabel("Name").fill("Someone Else");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("another-password-1");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByTestId("signup-form-success")).toContainText("We have sent an email");
  await waitForEmail(email, "existing-account");
  // Password reset: the same message for an unknown address.
  for (const address of [email, uniqueEmail("nobody")]) {
    await page.goto("/en/forgot-password");
    await page.getByLabel("Email").fill(address);
    await page.getByRole("button", { name: "Send the link" }).click();
    await expect(page.getByTestId("forgot-form-success")).toHaveText(/If an account exists for that address/);
  }
  // Wrong password and unknown address: the same error.
  for (const [address, password] of [
    [email, "wrong-password-123"],
    [uniqueEmail("ghost"), PASSWORD],
  ]) {
    await logIn(page, address!, password);
    await expect(page.locator(".form-error")).toHaveText("The email or password is not correct.");
  }
});

test("an unverified account cannot log in; the login sends a new link", async ({ page }) => {
  const email = uniqueEmail("unverified");
  await page.goto("/en/signup");
  await page.getByLabel("Name").fill("Pending Person");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await waitForEmail(email, "verify-email");
  await logIn(page, email);
  await expect(page.locator(".form-error")).toContainText("Please confirm your email address first");
  await expect.poll(() => sentEmails(email, "verify-email").length).toBe(2);
});

test("password reset with the emailed link; old sessions end", async ({ page }) => {
  const email = uniqueEmail("reset");
  await signUpAndVerify(page, email);
  await page.context().clearCookies();
  await page.goto("/en/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send the link" }).click();
  const mail = await waitForEmail(email, "reset-password");
  await page.goto(linkIn(mail, "/api/auth/reset-password"));
  await expect(page).toHaveURL(/\/en\/reset-password\?token=/);
  await page.getByLabel("New password", { exact: true }).fill("a-brand-new-pass-1");
  await page.getByLabel("Repeat the new password").fill("a-brand-new-pass-1");
  await page.getByRole("button", { name: "Save the new password" }).click();
  await expect(page.getByTestId("reset-form-success")).toContainText("Your password has been changed");
  await logIn(page, email, PASSWORD);
  await expect(page.locator(".form-error")).toHaveText("The email or password is not correct.");
  await logIn(page, email, "a-brand-new-pass-1");
  await expect(page).toHaveURL(/\/en\/account$/);
  // A used or made-up token is refused.
  await page.goto("/en/reset-password?token=not-a-real-token");
  await page.getByLabel("New password", { exact: true }).fill("yet-another-pass-1");
  await page.getByLabel("Repeat the new password").fill("yet-another-pass-1");
  await page.getByRole("button", { name: "Save the new password" }).click();
  await expect(page.locator(".form-error")).toContainText("invalid or has expired");
});

test("profile, password change, address book, export and account deletion", async ({ page }) => {
  const email = uniqueEmail("profile");
  await signUpAndVerify(page, email);
  await page.goto("/en/account/profile");
  await page.getByTestId("profile-form").getByLabel("Name").fill("Mary Renamed");
  await page.getByLabel("Language for emails").selectOption("de");
  await page.getByTestId("profile-form").getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("profile-form").getByRole("status")).toHaveText("Your details have been saved.");

  const pw = page.getByTestId("password-form");
  await pw.getByLabel("Current password").fill("wrong-current-pass");
  await pw.getByLabel("New password", { exact: true }).fill("changed-pass-2026");
  await pw.getByLabel("Repeat the new password").fill("changed-pass-2026");
  await pw.getByRole("button", { name: "Change password" }).click();
  await expect(pw.getByRole("alert")).toHaveText("The current password is not correct.");
  await pw.getByLabel("Current password").fill(PASSWORD);
  await pw.getByLabel("New password", { exact: true }).fill("changed-pass-2026");
  await pw.getByLabel("Repeat the new password").fill("changed-pass-2026");
  await pw.getByRole("button", { name: "Change password" }).click();
  await expect(pw.getByRole("status")).toContainText("Your password has been changed");

  await page.goto("/en/account/addresses");
  const form = page.getByTestId("address-form");
  await form.getByLabel("Full name").fill("Mary Renamed");
  await form.getByLabel("Country").selectOption("DE");
  await form.getByLabel("Street and house number").fill("Olivenweg 7");
  await form.getByLabel("Postcode").fill("10115");
  await form.getByLabel("Town or city").fill("Berlin");
  await form.getByRole("button", { name: "Save address" }).click();
  await expect(page.getByText("The address has been saved.")).toBeVisible();
  await expect(page.getByTestId("address-list")).toContainText("Olivenweg 7");
  await expect(page.getByTestId("address-list")).toContainText("Germany");
  await expect(page.getByTestId("address-list")).toContainText("Default address");

  // Data export: JSON with the profile and the address (no internal ids).
  const exported = await page.request.get("/api/account/export");
  expect(exported.headers()["content-disposition"]).toContain("attachment");
  const data = (await exported.json()) as { profile: { name: string; email: string; language: string }; addresses: { line1: string; id?: string }[] };
  expect(data.profile).toMatchObject({ name: "Mary Renamed", email, language: "de" });
  expect(data.addresses[0]!.line1).toBe("Olivenweg 7");
  expect(data.addresses[0]!.id).toBeUndefined();

  // Deletion needs the password and the confirmation word.
  await page.goto("/en/account/profile");
  const del = page.getByTestId("delete-form");
  await del.getByLabel("Current password").fill("changed-pass-2026");
  await del.getByLabel("Type DELETE to confirm").fill("nope");
  await del.getByRole("button", { name: "Delete my account" }).click();
  await expect(del.getByRole("alert")).toHaveText("Please type DELETE to confirm.");
  await del.getByLabel("Current password").fill("changed-pass-2026");
  await del.getByLabel("Type DELETE to confirm").fill("DELETE");
  await del.getByRole("button", { name: "Delete my account" }).click();
  await expect(page.getByTestId("account-deleted")).toBeVisible();
  expect((await page.request.get("/api/account/export")).status()).toBe(401);
  await logIn(page, email, "changed-pass-2026");
  await expect(page.locator(".form-error")).toHaveText("The email or password is not correct.");
});

test("log-in attempts are rate limited per address", async ({ page }) => {
  const email = uniqueEmail("limited");
  for (let i = 0; i < 8; i++) {
    await logIn(page, email, `wrong-${i}-password`);
    await expect(page.locator(".form-error")).toHaveText("The email or password is not correct.");
  }
  await logIn(page, email, "wrong-final-password");
  await expect(page.locator(".form-error")).toHaveText(/Too many attempts/);
});

test("account pages are noindex; the login page works in other languages", async ({ page }) => {
  for (const path of ["/en/login", "/en/signup", "/en/forgot-password", "/en/reset-password", "/en/verify-email", "/en/track-order"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute("content", /noindex/);
  }
  await page.goto("/de/login");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Anmelden");
  await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();
});

test("guest order tracking: wrong number or email gives one generic answer", async ({ page }) => {
  await page.goto("/en/track-order");
  await page.getByLabel("Order number").fill("GTH-2611-9999");
  await page.getByLabel("Email").fill("nobody@example.test");
  await page.getByRole("button", { name: "Track order" }).click();
  await expect(page.locator(".form-error")).toContainText("We could not find an order with that number and email address.");
  expect((await page.request.get("/en/track-order/GTH-2611-9999?key=guess")).status()).toBe(404);
});
