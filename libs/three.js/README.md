# three.js (for the example pages)

Potree depends on three.js via the **`three` npm package** (see `three` in the
root `package.json`). The library source imports `three` / `three/addons/*`
and Vite bundles it into `build/potree/potree.js`.

The standalone example HTML pages under `examples/` load three.js as plain
browser ES modules, so they need served `.js` files. Those are **copied from
the installed `three` package at build time** by `scripts/copy-three.mjs`
(wired into `npm run build` via `build:three`) into:

- `build/three.module.js`, `build/three.core.js` — the three.js runtime
- `lines/*`, `loaders/{OBJLoader,PLYLoader}.js` — the `examples/jsm` add-ons the
  demo pages use, with their bare `import ... from 'three'` rewritten to the
  relative `../build/three.module.js` so they resolve in the browser

Those three subfolders are **generated and git-ignored** — do not edit or commit
them; change the `three` dependency version instead and rebuild.

`extra/VRButton.js` is **not** stock three.js: it is a Potree-specific WebXR
button wrapper used by the viewer source, and is committed here.
