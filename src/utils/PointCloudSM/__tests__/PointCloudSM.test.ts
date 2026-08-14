import { describe, it, expect } from "vitest";

// Constructing PointCloudSM allocates a WebGLRenderTarget on a live renderer,
// which is unavailable headless. This smoke test only verifies module/barrel
// load; the pure camera math is covered by pointCloudSMMath.test.ts.
import { PointCloudSM } from "../PointCloudSM";

describe("PointCloudSM", () => {
	it("exports a constructable class", () => {
		expect(PointCloudSM).toBeTypeOf("function");
		expect(PointCloudSM.prototype.setLight).toBeTypeOf("function");
	});
});
