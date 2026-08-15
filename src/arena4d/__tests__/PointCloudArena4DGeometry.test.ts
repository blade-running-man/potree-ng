import { describe, it, expect } from "vitest";
import PotreeSource from "../../Potree.js?raw";
import {
	PointCloudArena4DGeometry,
	PointCloudArena4DGeometryNode,
} from "../PointCloudArena4DGeometry";

// Regression for: `ReferenceError: PointCloudArena4DGeometry is not defined`
// when loading an Arena4D (.vpc) point cloud (examples/arena4d.html).
//
// The Arena4D geometry module was left on the legacy `Potree.X = class`
// global-assignment style and was never imported, so it was tree-shaken out of
// the bundle and `Potree.js` referenced bare, undefined `PointCloudArena4DGeometry`
// / `PointCloudArena4D`. The fix converts it to ES exports (matching the octree
// geometry) and imports both classes into Potree.js.

describe("PointCloudArena4DGeometry module", () => {
	it("exports the geometry class with a static load()", () => {
		expect(typeof PointCloudArena4DGeometry).toBe("function");
		expect(typeof PointCloudArena4DGeometry.load).toBe("function");
	});

	it("exports the geometry node class", () => {
		expect(typeof PointCloudArena4DGeometryNode).toBe("function");
	});
});

describe("Potree.loadPointCloud Arena4D wiring", () => {
	it("Potree.js imports both Arena4D classes it references (.vpc path)", () => {
		// loadPointCloud() uses bare `PointCloudArena4DGeometry` and
		// `PointCloudArena4D`; they must be imported or they throw at runtime.
		expect(PotreeSource).toMatch(
			/import\s*\{[^}]*\bPointCloudArena4DGeometry\b[^}]*\}\s*from\s*["'][^"']*arena4d\/PointCloudArena4DGeometry["']/,
		);
		expect(PotreeSource).toMatch(
			/import\s*\{[^}]*\bPointCloudArena4D\b[^}]*\}\s*from\s*["'][^"']*arena4d\/PointCloudArena4D["']/,
		);
	});
});
