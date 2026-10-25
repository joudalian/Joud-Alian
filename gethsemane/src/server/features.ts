import "server-only";
import { FEATURES, type FeatureName } from "@/config/store";

export type Features = Record<FeatureName, boolean>;

/**
 * The feature flags in effect: FEATURES from src/config/store.ts, overridden by the FEATURES environment variable
 * ("reviews,newsletter" turns those on, "-christmas" turns one off; unknown names are ignored).
 */
export function features(): Features {
  const flags: Features = { ...FEATURES };
  for (const raw of (process.env.FEATURES ?? "").split(",")) {
    const item = raw.trim();
    const off = item.startsWith("-");
    const name = (off ? item.slice(1) : item) as FeatureName;
    if (name in flags) flags[name] = !off;
  }
  return flags;
}

export function feature(name: FeatureName): boolean {
  return features()[name];
}
