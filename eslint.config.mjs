import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Keep the imported Fluid registry compatible with its existing imperative animation patterns.
  // These React Compiler diagnostics remain enabled for our application components.
  {
    files: ["src/components/ui/sidebar-core.tsx", "src/components/ui/sidebar-menu.tsx", "src/components/ui/sidebar.tsx", "src/components/ui/tooltip.tsx", "src/components/ui/dialog.tsx", "src/components/ui/dropdown.tsx", "src/components/ui/menu-item.tsx"],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".pi/**",
    ".claude/**",
    ".codex/**",
    ".entire/**",
    "out/**",
    "build/**",
    "dist/**",
    ".wrangler/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
