# Gethsemane: catalog import

How to bring products over from the sister store (holylandtimber.com) with **data entry only**. Internal
document, not published on the site. Write all texts fresh for Gethsemane: do not copy the sister store's
wording. Every claim must be true for the piece (see the honesty rules in README → Honesty check).

## 1. What to collect for each product

| Field | Required | Notes | CSV column(s) |
| ----- | -------- | ----- | ------------- |
| Number | yes | Unique, never reused. Becomes the SKU `GTH-013` unless you give a SKU. | `id`, `sku` |
| URL name (slug) | yes | English, lowercase, dashes: `olive-wood-angel`. Same in every language. | `slug` |
| Name | yes (English) | Short, plain: "Olive Wood Angel". | `name_en`, `name_fr`, … |
| Short description | no | One or two sentences, shown under the name. | `summary_en`, … |
| Long description | yes (English) | What it is, how it is made, what it is for. No unverifiable claims. | `description_en`, … |
| Wood | no | Only `olive`. | `wood` |
| Finish | no | `natural` (unfinished), `oiled` or `waxed`. | `finish` |
| Size | no | Width × height × depth in **cm** (inches are calculated). | `size_w_cm`, `size_h_cm`, `size_d_cm` |
| Weight | no | In **grams** (ounces are calculated). | `weight_g` |
| Packaging | no | `giftBox`, `box` or `pouch`. | `packaging` |
| Gift note possible | no | yes/no. | `gift_note` |
| Variants | no | Sizes or versions, each with its own label, and optionally size, weight, price and SKU. | `variants_json` |
| Engraving | no | yes/no, maximum characters, extra price in USD. | `engraving`, `engraving_max_chars`, `engraving_extra_usd` |
| Price | yes | In **USD**. Other currencies are converted on the site. | `price_usd` |
| Previous price | no | Only if the piece was really sold at that price; shown struck through. | `compare_at_usd` |
| Photos | yes (1+) | See section 2. First = main photo. | `photos` (`slug/01.jpg|slug/02.jpg`) |
| Photo description | no | Alt text of the main photo; default "<name>, handmade from olive wood". | `photo_alt_en`, … |
| Category | yes (1+) | Slugs from `src/data/categories.ts`; a piece can be in several. | `categories` (`nativity|home`) |
| Availability | no | `in_stock`, `made_to_order` (default) or `sold_out`. | `availability` |
| Lead time | no | Days to make it before dispatch (made to order). | `lead_time_days` |
| Home page | no | yes to feature it on the home page. | `featured` |
| Tags | no | Lowercase words found by the shop search; `christmas` puts the piece in the Christmas collection. | `tags` (`angel|christmas`) |
| Complete the set | no | Main SKUs of other pieces suggested on this piece's page ("Complete the set"). | `related_skus` (`GTH-002|GTH-004`) |
| Languages to review | no | Languages whose text still needs a native check. | `needs_review` (`fr|de`) |
| Ready to sell | no | yes once every language is written and checked. | `launch_ready` |

`variants_json` is a JSON list, for example:

```json
[{ "id": "small", "label": { "en": "Small, 8 cm" }, "sizeCm": [4, 8, 2] },
 { "id": "large", "label": { "en": "Large, 15 cm", "fr": "Grand, 15 cm" }, "sizeCm": [7, 15, 3], "priceUsd": 39 }]
```

## 2. Photos

- Folder: `catalog/photos/<slug>/`, files `01.jpg`, `02.jpg`, … in display order (JPEG, PNG, WebP or AVIF).
- Recommended: **square, 1600×1600 px**, plain **white or cream** background, the piece filling most of the frame,
  daylight, no props that are not included, no text or watermarks.
- Photos straight from a phone are fine: the build turns them upright, reduces them to at most 2000 px and
  **removes all metadata, including the GPS location**, before anything is published.
- At least one photo per product; three to five is better (front, back, detail of the grain, in the hand for scale).

## 3. Import

1. Copy `docs/templates/products.csv` (one example row; delete it) and fill one row per product. Keep the header.
   For a single product you can also copy `docs/templates/product.json` into `src/data/products.ts` by hand.
2. Put the photos in `catalog/photos/<slug>/`.
3. `npm run catalog:import -- my-products.csv` checks every row with the site's own schema and prints the result
   (photo sizes are read from the files). Fix any reported problem and run it again.
4. `npm run catalog:import -- my-products.csv --write` appends the new products to `src/data/products.ts`
   (existing slugs are skipped).
5. `npm run check:i18n` (warnings list the languages still to translate), then `npm run verify`, commit, deploy.

A new **category** is one entry in `src/data/categories.ts` (slug, order, names and descriptions per language,
optional home-page gift ideas), plus `npm run assets` for its banner.

## 4. Before launch

- Remove or replace the 12 placeholder products (`src/data/products.ts`, `catalog/photos/`).
- Every product `launchReady: true`, nothing in `needsReview`.
- `SITE_URL=https://your-domain npm run check:launch` must pass (see `docs/LAUNCH.md`).
