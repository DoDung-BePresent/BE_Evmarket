import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      // Thêm các rule tùy chỉnh ở đây nếu muốn
      semi: ["error", "always"],
      quotes: ["error", "double"],
    },
  },
];
