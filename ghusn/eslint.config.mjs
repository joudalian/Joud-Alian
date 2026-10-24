import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      "react/no-danger": "error",
      "react/jsx-no-target-blank": ["error", { allowReferrer: false, enforceDynamicLinks: "always" }],
      "react/jsx-no-script-url": "error",
      "no-console": ["error", { allow: ["error"] }],
    },
  },
  {
    files: ["scripts/**", "tests/**", "playwright.config.ts"],
    rules: { "no-console": "off" },
  },
  globalIgnores([".next/**", "out/**", "node_modules/**", "next-env.d.ts", "test-results/**", "playwright-report/**", "reports/**"]),
]);
