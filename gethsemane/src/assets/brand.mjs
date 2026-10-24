// Brand mark (olive branch) shared by the React logo (src/components/Logo.tsx) and the asset generator.
// Coordinates are for a 64×64 viewBox.

export const branchStem = "M10 57 C 22 47, 34 35, 55 8";

const stemPoints = [
  [16, 52],
  [22, 46],
  [28, 40],
  [34, 33],
  [40, 26],
  [46, 19],
];
const stemAngle = -50;

/** Slender leaves alternating on both sides of the stem: [cx, cy, rotationDeg]. */
export const branchLeaves = [
  ...stemPoints.map(([x, y], i) => {
    const angle = stemAngle + (i % 2 ? 38 : -38);
    const rad = (angle * Math.PI) / 180;
    return [+(x + 8 * Math.cos(rad)).toFixed(1), +(y + 8 * Math.sin(rad)).toFixed(1), angle];
  }),
  [55, 9, stemAngle],
];
export const branchOlives = [
  [21, 52, 3.4],
  [33, 40, 3.1],
];

export function branchSvg({ leaf = "#4A5A2A", stem = "#7B5232", olive = "#C29A47" } = {}) {
  const leaves = branchLeaves
    .map(([cx, cy, r]) => `<ellipse cx="${cx}" cy="${cy}" rx="8.5" ry="2.9" transform="rotate(${r} ${cx} ${cy})" fill="${leaf}"/>`)
    .join("");
  const olives = branchOlives.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${olive}"/>`).join("");
  return `<path d="${branchStem}" fill="none" stroke="${stem}" stroke-width="2.4" stroke-linecap="round"/>${leaves}${olives}`;
}
