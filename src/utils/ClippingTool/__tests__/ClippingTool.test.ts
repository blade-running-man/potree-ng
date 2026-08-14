import { describe, it, expect } from "vitest";

import { ClippingTool } from "../ClippingTool";
import { EventDispatcher } from "../../../EventDispatcher";

function stubViewer() {
	return {
		inputHandler: { registerInteractiveScene: () => {}, addEventListener: () => {} },
	};
}

describe("ClippingTool", () => {
	it("constructs with the clip-volume scenes", () => {
		const tool = new ClippingTool(stubViewer());
		expect(tool).toBeInstanceOf(EventDispatcher);
		expect(tool.sceneVolume.name).toBe("scene_clip_volume");
		expect(tool.maxPolygonVertices).toBe(8);
		expect(tool.startInsertion).toBeTypeOf("function");
	});
});
