import { defineConfig } from "vitest/config";

// Unit tests run in a Node environment by default — the extracted `*Math`
// modules are pure and only need `three`'s math classes (Vector3/Matrix4/Box3),
// which work without a WebGL context. Smoke tests that touch the DOM opt into
// jsdom per-file via a `// @vitest-environment jsdom` docblock.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.{test,spec}.ts"],
    globals: false,
  },
});
