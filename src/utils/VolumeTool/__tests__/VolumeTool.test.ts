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

type Call = [string, string, unknown?];
function recordingScene() {
	const calls: Call[] = [];
	return {
		calls,
		addEventListener: (type: string, listener: unknown) => { calls.push(["add", type, listener]); },
		removeEventListener: (type: string, listener: unknown) => { calls.push(["removeOne", type, listener]); },
		removeEventListeners: (type: string) => { calls.push(["removeAll", type]); },
	};
}

describe("VolumeTool", () => {
	it("constructs and wires up a volume scene", () => {
		const tool = new VolumeTool(stubViewer());
		expect(tool).toBeInstanceOf(EventDispatcher);
		expect(tool.scene.name).toBe("scene_volume");
	});

	it("on scene change, moves exactly its own listeners off the old scene", () => {
		const tool = new VolumeTool(stubViewer());
		const oldScene = recordingScene();
		const newScene = recordingScene();

		tool.onSceneChange({ oldScene, scene: newScene });

		expect(oldScene.calls).toContainEqual(["removeOne", "volume_added", tool.onAdd]);
		expect(oldScene.calls).toContainEqual(["removeOne", "volume_removed", tool.onRemove]);
		expect(oldScene.calls.some((c) => c[0] === "removeAll")).toBe(false);
		expect(newScene.calls).toContainEqual(["add", "volume_added", tool.onAdd]);
		expect(newScene.calls).toContainEqual(["add", "volume_removed", tool.onRemove]);
	});
});
