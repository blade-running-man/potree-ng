// Vite's `?raw` import suffix returns a module's file contents as a string.
// The bundler resolves it at build time; TypeScript needs this ambient
// declaration to type such imports (e.g. the GLSL shader sources imported in
// src/materials/shaders/index.ts).
declare module "*?raw" {
  const source: string;
  export default source;
}
