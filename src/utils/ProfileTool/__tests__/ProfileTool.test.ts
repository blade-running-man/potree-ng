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

describe("ProfileTool", () => {
	it("constructs and wires up a profile scene", () => {
		const tool = new ProfileTool(stubViewer());
		expect(tool).toBeInstanceOf(EventDispatcher);
		expect(tool.scene.name).toBe("scene_profile");
	});

	it("on scene change, moves exactly its own listeners off the old scene", () => {
		const tool = new ProfileTool(stubViewer());
		const oldScene = recordingScene();
		const newScene = recordingScene();

		tool.onSceneChange({ oldScene, scene: newScene });

		// removed from the old scene by identity (2-arg removeEventListener)…
		expect(oldScene.calls).toContainEqual(["removeOne", "profile_added", tool.onAdd]);
		expect(oldScene.calls).toContainEqual(["removeOne", "profile_removed", tool.onRemove]);
		// …and NOT via removeEventListeners(type), which would nuke other tools' listeners
		expect(oldScene.calls.some((c) => c[0] === "removeAll")).toBe(false);
		// re-registered on the new scene
		expect(newScene.calls).toContainEqual(["add", "profile_added", tool.onAdd]);
		expect(newScene.calls).toContainEqual(["add", "profile_removed", tool.onRemove]);
	});

	it("without an old scene, only registers on the new scene", () => {
		const tool = new ProfileTool(stubViewer());
		const newScene = recordingScene();

		tool.onSceneChange({ oldScene: undefined, scene: newScene });

		expect(newScene.calls.filter((c) => c[0] === "add")).toHaveLength(2);
		expect(newScene.calls.some((c) => c[0].startsWith("remove"))).toBe(false);
	});
});
