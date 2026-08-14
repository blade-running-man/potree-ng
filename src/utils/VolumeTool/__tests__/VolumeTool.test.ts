import { describe, it, expect, vi } from "vitest";

vi.mock("../../../utils", () => ({
	Utils: { projectedRadius: () => 1, addCommas: (s: unknown) => String(s), getMousePointCloudIntersection: () => null },
}));

import { VolumeTool } from "../VolumeTool";
import { EventDispatcher } from "../../../EventDispatcher";

function stubViewer() {
	return {
		renderer: {},
		addEventListener: () => {},
		dispatchEvent: () => {},
		inputHandler: { registerInteractiveScene: () => {}, addEventListener: () => {} },
		scene: { volumes: [] as any[], addEventListener: () => {} },
	};
}

describe("VolumeTool", () => {
	it("constructs and wires up a volume scene", () => {
		const tool = new VolumeTool(stubViewer());
		expect(tool).toBeInstanceOf(EventDispatcher);
		expect(tool.scene.name).toBe("scene_volume");
		expect(tool.startInsertion).toBeTypeOf("function");
	});
});
