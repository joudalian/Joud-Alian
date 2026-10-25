/**
 * TEST FIXTURES — never shown on the real site. Included only in builds made with
 * NEXT_PUBLIC_CATALOG_FIXTURES=1 (the test builds from `npm run verify` / `npm test`), so the tests can exercise
 * variants, engraving, a gallery of three photos, a sale price, several categories and the English fallback
 * without depending on the real catalog. Photos live in catalog/fixtures/.
 */
import type { ProductInput } from "./catalog-schema";

export const fixtures: ProductInput[] = [
  {
    id: 9001,
    slug: "test-fixture-engraved-cross",
    categories: ["crosses", "home"],
    priceUsd: 40,
    compareAtUsd: 55,
    availability: "made_to_order",
    leadTimeDays: 10,
    images: [
      { file: "test-fixture-engraved-cross/01.webp", width: 1000, height: 1000, alt: { en: "Fixture cross, front", de: "Testkreuz, Vorderseite" } },
      { file: "test-fixture-engraved-cross/02.webp", width: 1200, height: 900 },
      { file: "test-fixture-engraved-cross/03.webp", width: 900, height: 1200, alt: { en: "Fixture cross, detail of the grain" } },
    ],
    variants: [
      { id: "small", label: { en: "Small, 10 cm", de: "Klein, 10 cm" }, sizeCm: [6, 10, 1], weightG: 40 },
      { id: "large", label: { en: "Large, 20 cm", de: "Groß, 20 cm" }, sizeCm: [12, 20, 2], weightG: 120, priceUsd: 65 },
    ],
    engraving: { enabled: true, maxChars: 20, extraUsd: 12 },
    wood: "olive",
    finish: "oiled",
    tags: ["test"],
    relatedSkus: ["GTH-004", "GTH-002"],
    text: {
      en: {
        name: "Fixture Engraved Cross",
        summary: "A test-only piece used by the automated tests.",
        description: "This product exists only in test builds. It has two sizes, optional engraving and three photos.",
      },
      de: {
        name: "Testkreuz mit Gravur",
        description: "Dieses Produkt gibt es nur in Test-Builds. Es hat zwei Größen, optionale Gravur und drei Fotos.",
      },
    },
  },
];
