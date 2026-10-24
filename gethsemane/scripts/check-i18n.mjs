// Fails (exit 1) if any language is missing a key, has an extra key, has an empty or
// unparsable ICU message, or if Arabic text / right-to-left handling appears in the project.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { IntlMessageFormat } from "intl-messageformat";

const root = fileURLToPath(new URL("..", import.meta.url));
const expectedLocales = ["en", "fr", "es", "it", "de", "el", "pl", "ro", "uk", "pt"];
const errors = [];

function flatten(obj, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) flatten(value, path, out);
    else out[path] = value;
  }
  return out;
}

const messageFiles = readdirSync(join(root, "messages")).filter((f) => f.endsWith(".json"));
const found = messageFiles.map((f) => f.replace(/\.json$/, "")).sort();
if (found.join() !== [...expectedLocales].sort().join()) {
  errors.push(`messages/ must contain exactly ${expectedLocales.join(", ")}; found ${found.join(", ")}`);
}

const localesSource = readFileSync(join(root, "src/i18n/locales.ts"), "utf8");
const declared = localesSource.match(/export const locales = \[([^\]]*)\]/)?.[1]?.match(/"([a-z]{2})"/g)?.map((s) => s.slice(1, -1));
if (!declared || declared.join() !== expectedLocales.join()) {
  errors.push(`src/i18n/locales.ts must declare ${expectedLocales.join(", ")} (in that order)`);
}

function argNames(message, locale) {
  const names = new Set();
  const visit = (elements) => {
    for (const el of elements) {
      if (el.type >= 1 && el.type <= 6) names.add(el.value);
      if (el.options) for (const option of Object.values(el.options)) visit(option.value);
      if (el.children) visit(el.children);
    }
  };
  try {
    visit(new IntlMessageFormat(message, locale).getAst());
  } catch {
    // reported separately
  }
  return [...names].sort().join();
}

const load = (locale) => flatten(JSON.parse(readFileSync(join(root, "messages", `${locale}.json`), "utf8")));
const base = load("en");
const baseKeys = Object.keys(base);

for (const locale of expectedLocales) {
  let messages;
  try {
    messages = load(locale);
  } catch (e) {
    errors.push(`${locale}: cannot read messages (${e.message})`);
    continue;
  }
  for (const key of baseKeys) if (!(key in messages)) errors.push(`${locale}: missing key "${key}"`);
  for (const key of Object.keys(messages)) if (!(key in base)) errors.push(`${locale}: extra key "${key}" (not in en)`);
  for (const [key, value] of Object.entries(messages)) {
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(`${locale}: "${key}" is empty or not a string`);
      continue;
    }
    try {
      new IntlMessageFormat(value, locale);
    } catch (e) {
      errors.push(`${locale}: "${key}" is not valid ICU (${e.message})`);
    }
    if (typeof base[key] === "string" && argNames(value, locale) !== argNames(base[key], "en")) {
      errors.push(`${locale}: "${key}" uses arguments {${argNames(value, locale)}} but en uses {${argNames(base[key], "en")}}`);
    }
  }
}

// No Arabic and no right-to-left logic anywhere in the project sources.
const arabicRanges = [[0x0600, 0x06ff], [0x0750, 0x077f], [0x08a0, 0x08ff], [0xfb50, 0xfdff], [0xfe70, 0xfefe]];
const arabic = new RegExp(`[${arabicRanges.map(([a, b]) => `${String.fromCodePoint(a)}-${String.fromCodePoint(b)}`).join("")}]`);
const rtl = /\brtl\b|dir=|Amiri/i;
const skipDirs = new Set(["node_modules", ".next", ".git", "test-results", "playwright-report", "reports", "public"]);
const textExt = /\.(tsx?|mjs|js|json|css|md|txt|xml|svg|example)$/;
const self = relative(root, fileURLToPath(import.meta.url));
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!skipDirs.has(name)) walk(full);
    } else if (textExt.test(name) && name !== "package-lock.json") {
      const rel = relative(root, full);
      const text = readFileSync(full, "utf8");
      if (arabic.test(text)) errors.push(`${rel}: contains Arabic characters`);
      if (rel !== self && rel !== "README.md" && rtl.test(text)) errors.push(`${rel}: contains RTL/dir handling`);
    }
  }
}
walk(root);

if (errors.length) {
  console.error(`i18n check failed with ${errors.length} problem(s):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`i18n check passed: ${expectedLocales.length} languages × ${baseKeys.length} keys, no Arabic or RTL handling.`);
