// Imports products from a CSV file (template: docs/templates/products.csv; fields: docs/CATALOG.md).
//
//   npm run catalog:import -- path/to/products.csv            check the file and print the products
//   npm run catalog:import -- path/to/products.csv --write    also append the new products to src/data/products.ts
//
// Every row is checked with the same schema as the site (src/data/catalog-schema.ts) before anything is written.
// Photo sizes are read from the files in catalog/photos/, so put the photos there first. Products whose slug
// already exists in src/data/products.ts are skipped (edit those by hand).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const file = process.argv[2];
const write = process.argv.includes("--write");
if (!file || !existsSync(file)) {
  console.error("Usage: npm run catalog:import -- <products.csv> [--write]");
  process.exit(1);
}

const { parseCatalog } = await import("../src/data/catalog-schema.ts");
const { locales } = await import("../src/i18n/locales.ts");
const { categories } = await import("../src/data/categories.ts");
const { products: existing } = await import("../src/data/products.ts");

/** RFC 4180 CSV: commas, double quotes ("" inside quotes), line breaks inside quoted fields. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

const [header, ...rows] = parseCsv(readFileSync(file, "utf8").replace(/^﻿/, ""));
const col = (row, name) => (row[header.indexOf(name)] ?? "").trim();
const list = (value) => value.split("|").map((v) => v.trim()).filter(Boolean);
const num = (value) => (value === "" ? undefined : Number(value));
const yes = (value) => /^(yes|true|1|y)$/i.test(value);

const problems = [];
const products = [];
for (const [n, row] of rows.entries()) {
  const where = `row ${n + 2}`;
  const slug = col(row, "slug");
  const text = {};
  for (const l of locales) {
    const name = col(row, `name_${l}`);
    const description = col(row, `description_${l}`);
    if (!name && !description) continue;
    text[l] = { name, ...(col(row, `summary_${l}`) ? { summary: col(row, `summary_${l}`) } : {}), description };
  }
  const images = [];
  for (const [i, photo] of list(col(row, "photos")).entries()) {
    const path = join(root, "catalog/photos", photo);
    if (!existsSync(path)) {
      problems.push(`${where} (${slug}): photo catalog/photos/${photo} not found`);
      continue;
    }
    const meta = await sharp(path).metadata();
    const swap = (meta.orientation ?? 1) >= 5;
    const alt = {};
    if (i === 0) for (const l of locales) if (col(row, `photo_alt_${l}`)) alt[l] = col(row, `photo_alt_${l}`);
    images.push({ file: photo, width: swap ? meta.height : meta.width, height: swap ? meta.width : meta.height, ...(Object.keys(alt).length ? { alt } : {}) });
  }
  const size = ["size_w_cm", "size_h_cm", "size_d_cm"].map((c) => num(col(row, c)));
  let variants;
  if (col(row, "variants_json")) {
    try {
      variants = JSON.parse(col(row, "variants_json"));
    } catch {
      problems.push(`${where} (${slug}): variants_json is not valid JSON`);
    }
  }
  const product = {
    id: num(col(row, "id")),
    slug,
    ...(col(row, "sku") ? { sku: col(row, "sku") } : {}),
    categories: list(col(row, "categories")),
    priceUsd: num(col(row, "price_usd")),
    ...(col(row, "compare_at_usd") ? { compareAtUsd: num(col(row, "compare_at_usd")) } : {}),
    ...(col(row, "availability") ? { availability: col(row, "availability") } : {}),
    ...(col(row, "lead_time_days") ? { leadTimeDays: num(col(row, "lead_time_days")) } : {}),
    images,
    ...(variants ? { variants } : {}),
    ...(yes(col(row, "engraving"))
      ? { engraving: { enabled: true, maxChars: num(col(row, "engraving_max_chars")) ?? 30, extraUsd: num(col(row, "engraving_extra_usd")) ?? 0 } }
      : {}),
    ...(yes(col(row, "featured")) ? { featured: true } : {}),
    ...(size.every((v) => v !== undefined) ? { sizeCm: size } : {}),
    ...(col(row, "weight_g") ? { weightG: num(col(row, "weight_g")) } : {}),
    ...(col(row, "wood") ? { wood: col(row, "wood") } : {}),
    ...(col(row, "finish") ? { finish: col(row, "finish") } : {}),
    ...(col(row, "packaging") ? { packaging: col(row, "packaging") } : {}),
    ...(yes(col(row, "gift_note")) ? { giftNote: true } : {}),
    ...(col(row, "tags") ? { tags: list(col(row, "tags")) } : {}),
    ...(col(row, "needs_review") ? { needsReview: list(col(row, "needs_review")) } : {}),
    ...(yes(col(row, "launch_ready")) ? { launchReady: true } : {}),
    text,
  };
  if (existing.some((p) => p.slug === slug)) console.warn(`${where}: "${slug}" already exists in src/data/products.ts, skipped.`);
  else products.push(product);
}

const check = parseCatalog({ categories, products: [...existing, ...products] }, locales);
problems.push(...check.problems);
if (problems.length) {
  console.error(`Import stopped, nothing written (${problems.length} problem(s)):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

const source = products.map((p) => `  ${JSON.stringify(p, null, 2).replace(/\n/g, "\n  ")},`).join("\n");
if (!write) {
  console.log(source);
  console.log(`\n${products.length} product(s) valid. Run again with --write to append them to src/data/products.ts.`);
} else {
  const target = join(root, "src/data/products.ts");
  const ts = readFileSync(target, "utf8");
  const end = ts.lastIndexOf("];");
  writeFileSync(target, `${ts.slice(0, end)}${source}\n${ts.slice(end)}`);
  console.log(`Appended ${products.length} product(s) to src/data/products.ts. Next: npm run check:i18n && npm run verify.`);
}
