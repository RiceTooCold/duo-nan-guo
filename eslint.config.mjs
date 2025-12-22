import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

// 1. 取得目前的目錄路徑（ESM 必備）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 2. 初始化 FlatCompat 工具
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // 3. 透過 compat 轉譯舊式的 Next.js 設定
  ...compat.extends("next/core-web-vitals"),
  ...compat.extends("next/typescript"),

  // 4. 設定忽略清單 (在 ESLint 9 中，單獨一個只有 ignores 的物件就是 global ignores)
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "generated/**", // 建議把之前的 prisma generated 也加上去
    ],
  },
];

export default eslintConfig;
