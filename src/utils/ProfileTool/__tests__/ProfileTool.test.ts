import { describe, it, expect, vi } from "vitest";

vi.mock("../../../utils", () => ({
	Utils: { projectedRadius: () => 1, getMousePointCloudIntersection: () => null },
}));

import { ProfileTool } from "../ProfileTool";
import { EventDispatcher } from "../../../EventDispatcher";

function stubViewer() {
	return {
		renderer: {},
		addEventListener: () => {},
		dispatchEvent: () => {},
		inputHandler: { registerInteractiveScene: () => {} },
		scene: { profiles: [] as any[], addEventListener: () => {} },
	};
}

describe("ProfileTool", () => {
	it("constructs and wires up a profile scene", () => {
		const tool = new ProfileTool(stubViewer());
		expect(tool).toBeInstanceOf(EventDispatcher);
		expect(tool.scene.name).toBe("scene_profile");
		expect(tool.startInsertion).toBeTypeOf("function");
	});
});
