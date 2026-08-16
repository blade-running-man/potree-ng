import { defineConfig } from "vitest/config";

// Unit tests run in a Node environment by default — the extracted `*Math`
// modules are pure and only need `three`'s math classes (Vector3/Matrix4/Box3),
// which work without a WebGL context. Smoke tests that touch the DOM opt into
// jsdom per-file via a `// @vitest-environment jsdom` docblock.
//
// The second pattern picks up the pure unit tests that live alongside the e2e
// harness (e.g. tests/e2e/utils/__tests__/*.test.ts). It is deliberately
// scoped to `__tests__/**/*.test.ts` so it matches those Node-only helpers but
// NOT the Playwright specs — those are `tests/e2e/specs/*.spec.ts` (`.spec.ts`,
// never inside an `__tests__/` dir) and import from `@playwright/test`, which
// vitest must not try to run.
export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/**/__tests__/**/*.{test,spec}.ts",
      "tests/e2e/**/__tests__/**/*.test.ts",
    ],
    globals: false,
  },
});
