import { describe, it, expect } from "vitest";

import { ClippingTool } from "../ClippingTool";
import { EventDispatcher } from "../../../EventDispatcher";

function stubViewer() {
	return {
		inputHandler: { registerInteractiveScene: () => {}, addEventListener: () => {} },
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

const CLIP_EVENTS = [
	"clip_volume_added",
	"clip_volume_removed",
	"polygon_clip_volume_added",
	"polygon_clip_volume_removed",
];

describe("ClippingTool", () => {
	it("constructs with the clip-volume scenes", () => {
		const tool = new ClippingTool(stubViewer());
		expect(tool).toBeInstanceOf(EventDispatcher);
		expect(tool.sceneVolume.name).toBe("scene_clip_volume");
		expect(tool.maxPolygonVertices).toBe(8);
	});

	it("setScene registers its 4 listeners on the new scene", () => {
		const tool = new ClippingTool(stubViewer());
		const sceneA = recordingScene();

		tool.setScene(sceneA);

		const added = sceneA.calls.filter((c) => c[0] === "add").map((c) => c[1]);
		expect(added.sort()).toEqual([...CLIP_EVENTS].sort());
	});

	it("setScene moves listeners off the old scene by identity (never removeEventListeners)", () => {
		const tool = new ClippingTool(stubViewer());
		const sceneA = recordingScene();
		const sceneB = recordingScene();

		tool.setScene(sceneA);
		tool.setScene(sceneB);

		const removed = sceneA.calls.filter((c) => c[0] === "removeOne");
		expect(removed).toHaveLength(4);
		expect(sceneA.calls.some((c) => c[0] === "removeAll")).toBe(false);
		// every removal targets one of the tool's own listeners
		for (const c of removed) {
			expect([tool.onAdd, tool.onRemove]).toContain(c[2]);
		}
		expect(sceneB.calls.filter((c) => c[0] === "add")).toHaveLength(4);
	});

	it("setScene is a no-op when the scene is unchanged", () => {
		const tool = new ClippingTool(stubViewer());
		const sceneA = recordingScene();

		tool.setScene(sceneA);
		const before = sceneA.calls.length;
		tool.setScene(sceneA);

		expect(sceneA.calls.length).toBe(before);
	});
});
