// Ghusn brand mark: a semicircular arch formed by an olive branch with leaves and olives.
// Shared by the React logo (src/components/Logo.tsx) and the image generator (scripts/generate-assets.mjs).
// Coordinates are for a 120×72 viewBox; colors come from the design tokens in src/app/globals.css.

export const ARCH_VIEWBOX = "0 0 120 72";
const cx = 60;
const cy = 66;
const r = 46;

/** The branch itself: a half circle from the bottom left to the bottom right. */
export const archStem = `M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`;

const round = (n) => Math.round(n * 10) / 10;

/** Leaves along the arch, alternating outside/inside: [cx, cy, rotationDeg, rx, ry]. */
export const archLeaves = (() => {
  const leaves = [];
  const count = 15;
  for (let i = 0; i < count; i++) {
    const a = ((172 - (i * 164) / (count - 1)) * Math.PI) / 180;
    const px = cx + r * Math.cos(a);
    const py = cy - r * Math.sin(a);
    // Direction of travel along the arch (left to right) in screen coordinates.
    const tangent = (Math.atan2(Math.cos(a), Math.sin(a)) * 180) / Math.PI;
    const outside = i % 2 === 0;
    const angle = tangent + (outside ? -38 : 38);
    const rad = (angle * Math.PI) / 180;
    const size = 1 - Math.abs(i - (count - 1) / 2) / count / 1.6;
    const len = 8 * size;
    leaves.push([round(px + len * Math.cos(rad)), round(py + len * Math.sin(rad)), round(angle), round(len), round(2.9 * size)]);
  }
  return leaves;
})();

/** A few olives hanging inside the arch: [cx, cy, radius]. */
export const archOlives = [118, 90, 62].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return [round(cx + (r - 6) * Math.cos(a)), round(cy - (r - 6) * Math.sin(a)), 2.6];
});

/** Standalone SVG markup of the mark (for generated images). */
export function archSvg({ leaf, stem, olive }) {
  const leaves = archLeaves
    .map(([x, y, rot, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="${leaf}"/>`)
    .join("");
  const olives = archOlives.map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${olive}"/>`).join("");
  return `<path d="${archStem}" fill="none" stroke="${stem}" stroke-width="2.4" stroke-linecap="round"/>${leaves}${olives}`;
}

export const WORDMARK = "GHUSN";
export const TAGLINE = "OLIVE WOOD · HOLY LAND";
