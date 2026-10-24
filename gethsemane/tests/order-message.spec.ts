import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { buildOrderMessage, fitOrderMessage } from "../src/lib/order-message";
import { MAX_ENCODED_MESSAGE, whatsappUrl, wellFormed } from "../src/lib/whatsapp";

const load = (locale: string) => JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8")) as { whatsapp: Record<string, string> };
const [el, en, uk] = [load("el"), load("en"), load("uk")];

// Pure checks of the WhatsApp message builder (no browser needed), run once.
test.skip(({ isMobile }) => isMobile, "run once");

/** A minimal ICU-free translator over the "whatsapp" namespace (the keys used here have only simple arguments). */
function translator(messages: { whatsapp: Record<string, string> }) {
  return (key: string, values: Record<string, string | number> = {}) =>
    messages.whatsapp[key]!.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
}

const lines = [{ slug: "nativity-set-classic", qty: 2 }];

test("each line carries the English name and SKU; the site language is noted", () => {
  const text = buildOrderMessage(translator(el), lines, "EUR", "el");
  expect(text).toMatch(/2 × .+ \(Classic Nativity Set, GTH-\d{3}\)/);
  expect(text).toContain("Site language: Ελληνικά (el)");
  const english = buildOrderMessage(translator(en), lines, "USD", "en");
  expect(english).toMatch(/2 × Classic Nativity Set — .+ \(GTH-\d{3}\)$/m);
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
  expect(message).toMatch(/2 × .+GTH-\d{3}/);
  expect(message).toContain("(скорочено)");
  expect(message).toContain("Вітаю!");
  const short = fitOrderMessage(t, lines, "USD", "uk", { notes: "Коротко" });
  expect(short.shortened).toBe(false);
});
