// Vite's `?raw` import suffix returns a module's file contents as a string.
// The bundler resolves it at build time; TypeScript needs this ambient
// declaration to type such imports (e.g. the GLSL shader sources imported in
// src/materials/shaders/index.ts).
declare module "*?raw" {
  const source: string;
  export default source;
}

// Vite/Vitest `import.meta.glob`, used by tests to scan sibling files (e.g. the
// example HTML pages). Minimal typing — enough for the eager string form.
interface ImportMeta {
  glob(
    pattern: string,
    options?: { query?: string; import?: string; eager?: boolean },
  ): Record<string, unknown>;
}
