// The site no longer takes orders or messages through the chat app it used before launch. This guard keeps the
// app's name, its link domain and the old phone number from creeping back into the code, the translations or the
// docs. Used by check:claims, check:launch, check:i18n and tests/channels.spec.ts. Only docs/CHANGELOG.md may
// mention the removal.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

export const removedChannelPatterns = [
  ["chat app name", /whats\s*app/i],
  ["chat link domain", /\bwa\.me\b/i],
  // 970 56 974 1193 in any spacing or punctuation, with or without the country code.
  ["old phone number", /5\D{0,2}6\D{0,2}9\D{0,2}7\D{0,2}4\D{0,2}1\D{0,2}1\D{0,2}9\D{0,2}3/],
];

const TEXT = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".md", ".css", ".txt", ".html", ".svg", ".yml", ".yaml"]);
const ALLOWED = new Set(["docs/CHANGELOG.md"]);

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (TEXT.has(extname(name))) yield path;
  }
}

/** Every mention in src/, messages/, docs/ and README.md, as "file:line: label". */
export function findRemovedChannels(root) {
  const found = [];
  const targets = ["src", "messages", "docs"].flatMap((d) => [...files(join(root, d))]).concat(join(root, "README.md"));
  for (const file of targets) {
    const rel = relative(root, file).split("\\").join("/");
    if (ALLOWED.has(rel)) continue;
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        for (const [label, re] of removedChannelPatterns) if (re.test(line)) found.push(`${rel}:${i + 1}: ${label}`);
      });
  }
  return found;
}
