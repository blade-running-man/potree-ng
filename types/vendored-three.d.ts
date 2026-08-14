// three.js is now an npm dependency ("three@^0.185"), typed by @types/three.
//
// - Core imports use the bare package specifier `"three"` (typed by
//   @types/three's index).
// - Add-on imports use the package subpath `"three/addons/*"` (e.g.
//   `three/addons/lines/Line2.js`, `three/addons/webxr/XRControllerModelFactory.js`),
//   which maps to three's `examples/jsm/*` and is typed by
//   @types/three/examples/jsm.
//
// Because @types/three now supplies types for both the core and the add-ons,
// no ambient wildcard module shims are required here anymore. The previous
// `declare module "*three.js/lines/*"` blocks (which shimmed the vendored
// add-on copies) have been removed.
//
// The vendored copies under `libs/three.js/**` are still referenced by files
// in `examples/`, but that directory is excluded from tsconfig, so those paths
// do not need shims for `tsc` to stay clean. This file is retained as
// documentation and as a home for any future three-related ambient types.

export {};
