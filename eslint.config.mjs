import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Code généré ou importé tel quel (client Prisma, composants shadcn/ui).
    "generated/**",
    "components/ui/**",
    "hooks/use-mobile.ts",
  ]),
  {
    rules: {
      // `const { id: _id, ...rest } = row` sert à écarter une propriété : ce n'est pas du code mort.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
]);

export default eslintConfig;
