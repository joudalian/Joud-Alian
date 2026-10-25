// Shipping regions (the same ones as DELIVERY_BY_REGION in src/config/store.ts). Plain module: used by the server
// (shipping prices) and by tests.

export const SHIPPING_REGIONS = ["europe", "northAmerica", "oceania", "middleEast", "restOfWorld"] as const;
export type ShippingRegion = (typeof SHIPPING_REGIONS)[number];

const EUROPE =
  "AD AL AT AX BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS SE SI SJ SK SM UA VA".split(" ");
const NORTH_AMERICA = "BM CA GL MX PM US".split(" ");
const OCEANIA = "AS AU CK FJ FM GU KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TO TV VU WF WS".split(" ");
const MIDDLE_EAST = "AE BH EG IL IQ IR JO KW LB OM PS QA SA SY TR YE".split(" ");

export function regionOf(country: string): ShippingRegion {
  const code = country.toUpperCase();
  if (EUROPE.includes(code)) return "europe";
  if (NORTH_AMERICA.includes(code)) return "northAmerica";
  if (OCEANIA.includes(code)) return "oceania";
  if (MIDDLE_EAST.includes(code)) return "middleEast";
  return "restOfWorld";
}
