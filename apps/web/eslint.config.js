import { nextJsConfig } from "@repo/eslint-config/next-js";
export default [
  ...nextJsConfig,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
