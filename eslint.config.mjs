import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "src/app/admin/webgl-test/**/*",
      "src/app/admin/webgl-test-2/**/*", 
      "src/app/admin/webgl-test-3/**/*",
      "src/app/admin/webgl-test-4/**/*"
    ]
  }
];

export default eslintConfig;
