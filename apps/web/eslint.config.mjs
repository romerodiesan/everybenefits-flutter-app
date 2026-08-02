import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import {
  pulseGlobalIgnores,
  pulseReactHooksRules,
} from "@pulse/eslint-config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(pulseGlobalIgnores),
  { rules: pulseReactHooksRules },
]);

export default eslintConfig;
