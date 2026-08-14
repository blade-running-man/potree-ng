// Copies the three.js runtime + the handful of examples/jsm add-ons that the
// demo pages load directly (as browser ES modules) from the installed `three`
// npm package into libs/three.js/. The library itself imports `three` /
// `three/addons/*` and is bundled by Vite; only the standalone example HTML
// pages need these served files. Keeping npm as the single source of truth
// (this copies at build time; the destination files are gitignored) means the
// examples always match the version the library was built against.
//
// Run from the repository root (npm run build:three). three.module.js
// re-exports from ./three.core.js, so both are copied side by side. Add-on
// files import the bare specifier `three`; since a browser can't resolve that
// without an import map, rewrite it to the relative build path (this mirrors
// how the old vendored add-ons imported three).
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const THREE = 'node_modules/three';
const OUT = 'libs/three.js';

// bare `from 'three'` (exact, not `three/addons/...`) -> relative build path.
const rewriteThreeImport = (src) =>
	src
		.replaceAll(`from 'three'`, `from '../build/three.module.js'`)
		.replaceAll(`from "three"`, `from "../build/three.module.js"`);

async function copyRaw(from, to) {
	await mkdir(dirname(to), { recursive: true });
	await copyFile(from, to);
	console.log(`copied  ${to}`);
}

async function copyAddon(rel) {
	const from = `${THREE}/examples/jsm/${rel}`;
	const to = `${OUT}/${rel}`;
	await mkdir(dirname(to), { recursive: true });
	await writeFile(to, rewriteThreeImport(await readFile(from, 'utf8')));
	console.log(`copied  ${to} (three import rewritten)`);
}

// Core runtime (module re-exports from core — both required).
await copyRaw(`${THREE}/build/three.module.js`, `${OUT}/build/three.module.js`);
await copyRaw(`${THREE}/build/three.core.js`, `${OUT}/build/three.core.js`);

// Add-ons the example pages import directly.
const addons = [
	'lines/Line2.js',
	'lines/LineGeometry.js',
	'lines/LineMaterial.js',
	'lines/LineSegments2.js',
	'lines/LineSegmentsGeometry.js',
	'loaders/OBJLoader.js',
	'loaders/PLYLoader.js',
];
for (const rel of addons) {
	await copyAddon(rel);
}

console.log(`\nthree r${JSON.parse(await readFile(`${THREE}/package.json`, 'utf8')).version} copied into ${OUT}/ for the example pages.`);
