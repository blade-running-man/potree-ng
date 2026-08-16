import { describe, it, expect } from "vitest";

// Regression for: `ReferenceError: Copc is not defined` on
// examples/ept_binary.html. EPT (ept.json) and COPC (.copc) point clouds load
// through EptLoader/CopcLoader, which build PointCloudCopcGeometryNode — that
// reads the `window.Copc` global provided by `libs/copc/index.js`. Any example
// that loads such a cloud must therefore include the copc script, or the loader
// throws. ept_binary.html and ept_zstandard.html were missing it.

// Load every example page as a raw string, keyed by path. `import.meta.glob`
// is statically replaced by Vite/Vitest at transform time, so it must be called
// literally (not aliased).
const examples = import.meta.glob("../../examples/*.html", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const COPC_SCRIPT = "libs/copc/index.js";
// An example needs copc if it loads an EPT (ept.json) or COPC (.copc) source.
const NEEDS_COPC = /ept\.json|\.copc\b/;

describe("examples that load EPT/COPC point clouds", () => {
	it("finds example pages to scan", () => {
		expect(Object.keys(examples).length).toBeGreaterThan(0);
	});

	it("include the copc library script (window.Copc)", () => {
		const missing: string[] = [];
		for (const [path, html] of Object.entries(examples)) {
			if (NEEDS_COPC.test(html) && !html.includes(COPC_SCRIPT)) {
				missing.push(path.split("/").pop() ?? path);
			}
		}
		expect(missing, `EPT/COPC examples missing ${COPC_SCRIPT}: ${missing.join(", ")}`).toEqual([]);
	});
});
