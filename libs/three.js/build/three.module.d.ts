// Type bridge for the vendored three build (three r124). Potree imports THREE
// from this relative path rather than the `three` npm package:
//
//   import * as THREE from ".../libs/three.js/build/three.module.js";
//
// TypeScript resolves that `.js` import to this co-located `.d.ts` first, giving
// the whole codebase the `@types/three` typings (installed at ^0.125, the
// nearest published match to r124). A co-located real module is used instead of
// an ambient `declare module "*..."` because an ambient wildcard re-export drops
// class inheritance (a re-exported OrthographicCamera would lose Object3D
// members like `position`). esbuild/Vite still bundle the real `three.module.js`
// at build time; this file is types-only.
export * from "three";
