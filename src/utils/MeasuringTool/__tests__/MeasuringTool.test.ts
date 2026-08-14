import { describe, it, expect, vi } from "vitest";

vi.mock("../../../utils", () => ({
	Utils: {
		projectedRadius: () => 1,
		getNorthVec: () => ({}),
		computeAzimuth: () => 0,
		getMousePointCloudIntersection: () => null,
		addCommas: (s: unknown) => String(s),
	},
}));

import { MeasuringTool } from "../MeasuringTool";
import { EventDispatcher } from "../../../EventDispatcher";

function stubViewer() {
	return {
		renderer: {},
		addEventListener: () => {},
		dispatchEvent: () => {},
		inputHandler: { registerInteractiveScene: () => {} },
		scene: { measurements: [] as any[], addEventListener: () => {} },
	};
}

describe("MeasuringTool", () => {
	it("constructs and wires up a measurement scene", () => {
		const tool = new MeasuringTool(stubViewer());
		expect(tool).toBeInstanceOf(EventDispatcher);
		expect(tool.scene.name).toBe("scene_measurement");
		expect(tool.startInsertion).toBeTypeOf("function");
	});
});
