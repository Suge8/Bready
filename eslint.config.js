
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";

export default [
  {
    ignores: [
      "dist-electron/",
      "out/",
      "dist/",
      "node_modules/",
      "*.config.*",
      "coverage/",
      "tests/**",
      "src/**/__tests__/**",
      "**/*.spec.*",
      "**/*.test.*",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2023,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      react: pluginReact,
      "react-hooks": pluginReactHooks,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      ...prettierConfig.rules,
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-explicit-any": "off",
      "react/react-in-jsx-scope": "off",
    },
    settings: {
      react: { version: "detect" },
    },
  },
];
