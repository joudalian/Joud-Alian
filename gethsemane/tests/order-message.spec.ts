import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { buildOrderMessage, fitOrderMessage } from "../src/lib/order-message";
import { MAX_ENCODED_MESSAGE, whatsappUrl, wellFormed } from "../src/lib/whatsapp";
import { fixture, nameOf, price, priceOf, simple } from "./catalog";

const load = (locale: string) => JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8")) as { whatsapp: Record<string, string> };
const [el, en, uk, de] = [load("el"), load("en"), load("uk"), load("de")];

// Pure checks of the WhatsApp message builder (no browser needed), run once.
test.skip(({ isMobile }) => isMobile, "run once");

/** A minimal ICU-free translator over the "whatsapp" namespace (the keys used here have only simple arguments). */
function translator(messages: { whatsapp: Record<string, string> }) {
  return (key: string, values: Record<string, string | number> = {}) =>
    messages.whatsapp[key]!.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
}

const lines = [{ slug: simple.slug, qty: 2 }];

test("each line carries the English name and SKU; the site language is noted", () => {
  const text = buildOrderMessage(translator(el), lines, "EUR", "el");
  expect(text).toContain(`(${nameOf(simple)}, ${simple.sku})`);
  expect(text).toContain("Site language: Ελληνικά (el)");
  const english = buildOrderMessage(translator(en), lines, "USD", "en");
  expect(english).toContain(`2 × ${nameOf(simple)} — ${price(priceOf(simple) * 2)} (${simple.sku})`);
});

test("a ticked gift-note box is always mentioned, even without text", () => {
  const t = translator(en);
  expect(buildOrderMessage(t, lines, "USD", "en", { giftNote: "" })).toContain("Gift note: (no text yet)");
  expect(buildOrderMessage(t, lines, "USD", "en", { giftNote: "Happy birthday" })).toContain("Gift note: Happy birthday");
  expect(buildOrderMessage(t, lines, "USD", "en", {})).not.toContain("Gift note");
});

test("Greek and Ukrainian text survive URL encoding", () => {
  for (const [messages, locale, notes] of [
    [el, "el", "Παρακαλώ τυλίξτε το για δώρο"],
    [uk, "uk", "Будь ласка, загорніть як подарунок; дякую!"],
  ] as const) {
    const text = buildOrderMessage(translator(messages), lines, "EUR", locale, { name: "Ολγα Ковальчук", notes });
    const url = whatsappUrl(text);
    expect(decodeURIComponent(new URL(url).searchParams.get("text") ?? "")).toBe(text);
    expect(url).not.toMatch(/[^\x21-\x7e]/);
  }
});

test("a lone surrogate never breaks the link", () => {
  const broken = "Notes \uD83D end";
  expect(() => encodeURIComponent(broken)).toThrow();
  expect(wellFormed(broken)).toBe("Notes � end");
  expect(whatsappUrl(broken)).toContain("%EF%BF%BD");
});

test("very long notes are shortened in the link, never the items", () => {
  const t = translator(uk);
  const notes = "Дуже довгий опис побажань. ".repeat(60);
  const { message, shortened } = fitOrderMessage(t, lines, "USD", "uk", { notes, giftNote: "Вітаю!" });
  expect(shortened).toBe(true);
  expect(encodeURIComponent(message).length).toBeLessThanOrEqual(MAX_ENCODED_MESSAGE);
  expect(message).toContain(simple.sku);
  expect(message).toContain("(скорочено)");
  expect(message).toContain("Вітаю!");
  const short = fitOrderMessage(t, lines, "USD", "uk", { notes: "Коротко" });
  expect(short.shortened).toBe(false);
});

test("variant, engraving, SKU and English name travel with the line; prices include both", () => {
  const variant = fixture.variants.at(-1)!;
  // German: the fixture has German text, so the English name is added for the owner.
  const t = translator(de);
  const text = buildOrderMessage(t, [{ slug: fixture.slug, qty: 2, variantId: variant.id, engraving: "Anna" }], "USD", "de");
  const unit = priceOf(fixture, variant.id, true);
  expect(unit).toBe((variant.priceUsd ?? fixture.priceUsd) + fixture.engraving!.extraUsd);
  expect(text).toContain(`${nameOf(fixture, "de")}, ${variant.label.de ?? variant.label.en}`);
  expect(text).toContain(`(${fixture.text.en.name}, ${variant.label.en}, ${variant.sku})`);
  expect(text).toContain("Gravur: „Anna“");
  expect(text).toContain(price(unit * 2, "USD", "de"));
  // Greek has no fixture text yet: the English name is shown once, not repeated.
  const greek = buildOrderMessage(translator(el), [{ slug: fixture.slug, qty: 1, variantId: variant.id }], "USD", "el");
  expect(greek).toContain(`${fixture.text.en.name}, ${variant.label.en} — `);
  expect(greek).toContain(`(${variant.sku})`);
});

test("lines that can no longer be ordered are left out of the message", () => {
  const t = translator(en);
  const lines = [
    { slug: "a-removed-piece", qty: 1 },
    { slug: fixture.slug, qty: 1 }, // the fixture needs a variant
    { slug: fixture.slug, qty: 1, variantId: "no-such-size" },
    ...(simple.engraving?.enabled ? [] : [{ slug: simple.slug, qty: 1, engraving: "not offered" }]),
  ];
  expect(buildOrderMessage(t, lines, "USD", "en")).toBe("");
  expect(buildOrderMessage(t, [...lines, { slug: simple.slug, qty: 1 }], "USD", "en")).toContain(`1 × ${nameOf(simple)}`);
});
