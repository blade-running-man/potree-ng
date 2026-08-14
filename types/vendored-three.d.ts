// Potree imports THREE from a *vendored* copy (three r124) rather than the
// `three` npm package:
//
//   import * as THREE from "../libs/three.js/build/three.module.js";
//   import { Line2 } from "../../libs/three.js/lines/Line2.js";
//
// `tsconfig` `paths` cannot map relative specifiers, so we forward the vendored
// module paths to the `@types/three` typings (installed at ^0.125, the nearest
// published match to r124). Wildcard module declarations match every relative
// depth (`../`, `../../`, ...). A handful of genuine r124<->r125 API diffs are
// suppressed at the call site with `// @ts-expect-error`.

declare module "*three.js/build/three.module.js" {
  export * from "three";
}

// three add-ons used by Potree (examples/jsm equivalents), also vendored.
declare module "*three.js/lines/Line2.js" {
  export * from "three";
}
declare module "*three.js/lines/LineGeometry.js" {
  export * from "three";
}
declare module "*three.js/lines/LineMaterial.js" {
  export * from "three";
}
declare module "*three.js/lines/LineSegments2.js" {
  export * from "three";
}
declare module "*three.js/lines/LineSegmentsGeometry.js" {
  export * from "three";
}
