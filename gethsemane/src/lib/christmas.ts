import { products, type Product } from "./catalog";

/** Pieces in the Christmas collection: tagged "christmas" in src/data/products.ts, not sold out. */
export function christmasProducts(): Product[] {
  return products.filter((p) => p.tags.includes("christmas") && p.availability !== "sold_out");
}
