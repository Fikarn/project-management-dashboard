import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    setupFiles: ["__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/**", "app/api/**"],
      exclude: ["lib/types.ts"],
      thresholds: {
        lines: 20,
        functions: 15,
        branches: 20,
        statements: 20,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
