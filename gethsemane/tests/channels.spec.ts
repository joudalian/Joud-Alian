import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { findRemovedChannels, removedChannelPatterns } from "../scripts/removed-channels.mjs";

// The old chat ordering channel was removed for good (docs/CHANGELOG.md). Its name, link domain and phone number
// must not come back in the code, the translations or the docs.
test.skip(({ isMobile }) => isMobile, "run once");

test("no mention of the removed chat channel in src, messages or docs", () => {
  expect(findRemovedChannels(fileURLToPath(new URL("..", import.meta.url)))).toEqual([]);
});

test("the guard recognises every form of it", () => {
  const caught = (text: string) => removedChannelPatterns.some(([, re]) => re.test(text));
  for (const text of ["Chat on WhatsApp", "whats app", "https://wa.me/123", "+970 56 974 1193", "0569741193", "970-569-741-193"]) {
    expect(caught(text), text).toBe(true);
  }
  for (const text of ["Write to us by email", "GTH-2611-0001", "Contact form"]) expect(caught(text), text).toBe(false);
});
