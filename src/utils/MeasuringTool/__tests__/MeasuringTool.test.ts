import { describe, it, expect, vi } from "vitest";

// TextSprite renders onto a 2D canvas (unavailable headless); Utils pulls a
// heavy chain. Stub both so a real Measure can be created during startInsertion.
vi.mock("../../../TextSprite", async () => {
	const T = await import("three");
	class TextSprite extends T.Object3D {
		material: Record<string, unknown> = {};
		fontsize = 0;
		constructor(_text?: string) { super(); }
		setText() {}
		setTextColor() {}
		setBorderColor() {}
		setBackgroundColor() {}
	}
	return { TextSprite };
});
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

function insertionViewer() {
	return {
		renderer: { domElement: { addEventListener: () => {}, removeEventListener: () => {} } },
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => {},
		inputHandler: { registerInteractiveScene: () => {}, startDragging: () => {} },
		scene: { measurements: [] as any[], addEventListener: () => {}, addMeasurement: () => {} },
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

describe("MeasuringTool", () => {
	it("constructs and wires up a measurement scene", () => {
		const tool = new MeasuringTool(stubViewer());
		expect(tool).toBeInstanceOf(EventDispatcher);
		expect(tool.scene.name).toBe("scene_measurement");
	});

	it("moves its own listeners on scene change (never removeEventListeners)", () => {
		const tool = new MeasuringTool(stubViewer());
		const oldScene = recordingScene();
		const newScene = recordingScene();

		tool.onSceneChange({ oldScene, scene: newScene });

		expect(oldScene.calls).toContainEqual(["removeOne", "measurement_added", tool.onAdd]);
		expect(oldScene.calls).toContainEqual(["removeOne", "measurement_removed", tool.onRemove]);
		expect(oldScene.calls.some((c) => c[0] === "removeAll")).toBe(false);
		expect(newScene.calls.filter((c) => c[0] === "add")).toHaveLength(2);
	});

	describe("startInsertion flag defaults", () => {
		it("defaults showDistances to true when omitted (regression for === null bug)", () => {
			const tool = new MeasuringTool(insertionViewer());
			expect(tool.startInsertion({}).showDistances).toBe(true);
		});

		it("honours an explicit showDistances value", () => {
			const tool = new MeasuringTool(insertionViewer());
			expect(tool.startInsertion({ showDistances: false }).showDistances).toBe(false);
			expect(tool.startInsertion({ showDistances: true }).showDistances).toBe(true);
		});

		it("applies the documented defaults for the other flags", () => {
			const measure = new MeasuringTool(insertionViewer()).startInsertion({});
			expect(measure.showArea).toBe(false);
			expect(measure.showEdges).toBe(true);
			expect(measure.closed).toBe(false);
			expect(measure.showAzimuth).toBe(false);
		});
	});
});
