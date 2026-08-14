// Runtime globals that Potree expects to already exist on `window`. In the
// deployed app these are loaded by <script> tags in the example HTML (jQuery,
// TWEEN, d3, proj4, OpenLayers, i18next, Stats, ...). They are never imported
// or bundled, so TypeScript needs ambient declarations for them.
//
// jQuery ($ / jQuery) is typed by @types/jquery (global). The rest are declared
// `any` for now and will be tightened to real typings in the phase that
// migrates the files actually using them (e.g. the vendored d3 is v3-era, whose
// `@types/d3` do not match the modern package, so `any` is the honest choice
// until then).

declare global {
  const TWEEN: any;
  const d3: any;
  const proj4: any;
  const ol: any;
  const i18next: any;
  const i18n: any;
  const Stats: any;
  const shapefile: any;
  const BinaryHeap: any;
  const LASFile: any;
  const LASDecoder: any;
  const ProgressBar: any;

  // Potree's own globals referenced across the codebase.
  const LRU: any;
  const Potree: any;
  const viewer: any;
  const initSidebar: any;
  const HoverMenu: any;
  const HoverMenuItem: any;
}

export {};
