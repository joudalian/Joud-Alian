import { expect, test } from "@playwright/test";

test.describe("security headers", () => {
  test("pages send a strict CSP and hardening headers", async ({ request }) => {
    const res = await request.get("/en");
    const h = res.headers();
    expect(h["x-powered-by"]).toBeUndefined();
    const csp = h["content-security-policy"] ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toMatch(/https?:\/\//);
    expect(h["strict-transport-security"]).toContain("max-age=");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["permissions-policy"]).toContain("microphone=()");
    expect(h["permissions-policy"]).toContain("geolocation=()");
    expect(h["permissions-policy"]).toContain("payment=()");
  });

  test("a fresh nonce is used on every request and on every script", async ({ request }) => {
    const a = (await request.get("/en")).headers()["content-security-policy"];
    const b = (await request.get("/en")).headers()["content-security-policy"];
    expect(a).not.toBe(b);
    const res = await request.get("/en/shop");
    const nonce = res.headers()["content-security-policy"]?.match(/'nonce-([^']+)'/)?.[1];
    const html = await res.text();
    // JSON-LD blocks are data, not executed, so only executable scripts need the nonce.
    const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]).filter((tag) => !tag.includes("application/ld+json"));
    expect(scripts.length).toBeGreaterThan(0);
    for (const tag of scripts) expect(tag).toContain(`nonce="${nonce}"`);
  });

  test("static files also get the hardening headers", async ({ request }) => {
    const res = await request.get("/brand/gethsemane-mark.svg");
    expect(res.status()).toBe(200);
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["x-powered-by"]).toBeUndefined();
  });

  test("no third-party requests, no source maps, no inline handlers", async ({ page, request }) => {
    const external: string[] = [];
    page.on("request", (req) => {
      if (!req.url().startsWith(new URL(page.url() || "http://localhost").origin) && !req.url().startsWith("data:")) external.push(req.url());
    });
    await page.goto("/en");
    await page.waitForLoadState("networkidle");
    expect(external.filter((u) => !u.startsWith("http://localhost"))).toEqual([]);
    const html = await page.content();
    expect(html).not.toMatch(/\son[a-z]+="/i);
    expect(html).not.toContain("<iframe");
    const scriptUrls = await page.evaluate(() => Array.from(document.scripts).map((s) => s.src).filter(Boolean));
    for (const src of scriptUrls) {
      const js = await (await request.get(src)).text();
      expect(js).not.toContain("sourceMappingURL=");
      expect((await request.get(`${src}.map`)).status()).toBe(404);
    }
  });

});
