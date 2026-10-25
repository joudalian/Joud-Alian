// Builds the compact header/footer mark from the approved vector logo (../brand/gethsemane-logo.svg):
// keeps the arch scene and the cross, drops the cream background, the outer gold rings and the
// text (the wordmark is rendered as live text on the site). Output: public/brand/gethsemane-mark.svg
import { readFileSync, writeFileSync } from "node:fs";

export function buildMarkSvg(sourcePath) {
  const src = readFileSync(sourcePath, "utf8");
  const open = src.indexOf('<g transform="translate(0,66)">');
  const close = src.lastIndexOf("</g>");
  if (open < 0 || close < 0) throw new Error("Unexpected logo SVG structure: scene group not found");
  let scene = src.slice(open + '<g transform="translate(0,66)">'.length, close);
  // Remove the wordmark, the rule under it and the tagline.
  const before = scene.length;
  scene = scene.replace(/<text\b[\s\S]*?<\/text>\s*/g, "").replace(/<line x1="352" y1="766"[^>]*\/>\s*/, "");
  if (scene.length === before || /<text/.test(scene)) throw new Error("Could not remove the logo text");
  // A specific clipPath id, in case the file is ever inlined next to other SVGs.
  scene = scene.replace(/id="w"/, 'id="gethsemane-arch"').replace(/url\(#w\)/g, "url(#gethsemane-arch)");
  // Scene bounds in the group's own coordinates: x 246–778, y 12–654 (cross top to base line).
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="244 10 536 648" width="536" height="648">\n${scene.trim()}\n</svg>\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const svg = buildMarkSvg(new URL("../../brand/gethsemane-logo.svg", import.meta.url));
  writeFileSync(new URL("../public/brand/gethsemane-mark.svg", import.meta.url), svg);
  console.log(`Wrote public/brand/gethsemane-mark.svg (${svg.length} bytes)`);
}
