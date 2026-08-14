import { describe, it, expect, vi } from "vitest";

// Constructing the gizmo needs the runtime Potree/TWEEN globals, a TextureLoader
// and a full viewer — infeasible headless. This smoke test only verifies the
// module/barrel load; the gizmo math is covered by transformationToolMath.test.ts.
vi.mock("../../../utils", () => ({ Utils: { mouseToRay: () => ({}), projectedRadius: () => 1, moveTo: () => {} } }));

import { TransformationTool } from "../TransformationTool";

describe("TransformationTool", () => {
	it("exports a constructable class", () => {
		expect(TransformationTool).toBeTypeOf("function");
		expect(TransformationTool.prototype.update).toBeTypeOf("function");
	});
});
