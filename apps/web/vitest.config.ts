import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "lib/ai/evals/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // server-only throws in non-Next bundles; stub it for unit tests.
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
});
