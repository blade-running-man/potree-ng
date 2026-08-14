// The vendored three *build* (build/three.module.js) is typed by a co-located
// declaration file at libs/three.js/build/three.module.d.ts (a real module,
// which preserves class inheritance). See that file for why an ambient wildcard
// is NOT used for it.
//
// The three add-ons below (examples/jsm equivalents) are also vendored but are
// NOT part of the core `three` types, so they are declared permissively here via
// ambient wildcard modules. `any` is fine for them (no inheritance to preserve);
// tighten to real typings when a `.ts` file first imports them.

declare module "*three.js/lines/Line2.js" {
  export const Line2: any;
}
declare module "*three.js/lines/LineGeometry.js" {
  export const LineGeometry: any;
}
declare module "*three.js/lines/LineMaterial.js" {
  export const LineMaterial: any;
}
declare module "*three.js/lines/LineSegments2.js" {
  export const LineSegments2: any;
}
declare module "*three.js/lines/LineSegmentsGeometry.js" {
  export const LineSegmentsGeometry: any;
}
