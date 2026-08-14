import { describe, it, expect, vi } from "vitest";

vi.mock("../../../Annotation", () => ({
	Annotation: class {
		position = { copy: () => {} };
		constructor (public args: any) {}
	},
}));
vi.mock("../../../utils", () => ({ Utils: { getMousePointCloudIntersection: () => null } }));

import { AnnotationTool } from "../AnnotationTool";
import { EventDispatcher } from "../../../EventDispatcher";

function stubViewer() {
	const annotations = {
		added: [] as any[],
		removed: [] as any[],
		add (a: any) { this.added.push(a); },
		remove (a: any) { this.removed.push(a); },
	};
	const mouseupListeners: any[] = [];
	const dragged: any[] = [];
	return {
		annotations,
		mouseupListeners,
		dragged,
		renderer: {
			domElement: {
				addEventListener: (t: string, fn: any) => { if (t === "mouseup") mouseupListeners.push(fn); },
				removeEventListener: () => {},
			},
		},
		scene: {
			annotations,
			scene: { add: () => {}, remove: () => {} },
			getActiveCamera: () => ({}),
			pointclouds: [] as any[],
		},
		inputHandler: { startDragging: (s: any) => dragged.push(s) },
	};
}

describe("AnnotationTool", () => {
	it("constructs an EventDispatcher", () => {
		expect(new AnnotationTool({ renderer: {} })).toBeInstanceOf(EventDispatcher);
	});

	it("startInsertion adds the annotation, dispatches, registers mouseup and starts dragging", () => {
		const viewer = stubViewer();
		const tool = new AnnotationTool(viewer);
		let dispatched = false;
		(tool as any).addEventListener("start_inserting_annotation", () => { dispatched = true; });

		const annotation = tool.startInsertion();

		expect(dispatched).toBe(true);
		expect(viewer.annotations.added).toContain(annotation);
		expect(viewer.mouseupListeners).toHaveLength(1);
		expect(viewer.dragged).toEqual([tool.s]);
	});

	it("right-click during insertion cancels and removes the annotation", () => {
		const viewer = stubViewer();
		const tool = new AnnotationTool(viewer);
		const annotation = tool.startInsertion();

		viewer.mouseupListeners[0]({ button: 2 }); // THREE.MOUSE.RIGHT

		expect(viewer.annotations.removed).toContain(annotation);
	});

	it("left-click during insertion finishes without removing the annotation", () => {
		const viewer = stubViewer();
		const tool = new AnnotationTool(viewer);
		const annotation = tool.startInsertion();

		viewer.mouseupListeners[0]({ button: 0 }); // THREE.MOUSE.LEFT

		expect(viewer.annotations.removed).not.toContain(annotation);
	});
});
