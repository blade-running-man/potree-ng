import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";

// TextSprite renders onto a 2D canvas (unavailable in tests) and Utils pulls in
// a heavy circular module chain. Stub both; neither's rendering/picking is
// exercised by these behavioural checks.
vi.mock("../../../TextSprite", async () => {
	const T = await import("three");
	class TextSprite extends T.Object3D {
		material: Record<string, unknown> = {};
		fontsize = 0;
		constructor(_text?: string) {
			super();
		}
		setText() {}
		setTextColor() {}
		setBorderColor() {}
		setBackgroundColor() {}
	}
	return { TextSprite };
});

vi.mock("../../../utils", () => ({
	Utils: {
		getMousePointCloudIntersection: () => null,
		addCommas: (s: unknown) => String(s),
	},
}));

import { Measure } from "../Measure";

const v = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);

function triangle(): Measure {
	const m = new Measure();
	m.addMarker(v(0, 0, 0));
	m.addMarker(v(4, 0, 0));
	m.addMarker(v(0, 3, 0));
	return m;
}

describe("Measure", () => {
	it("constructs empty with a Measure_N name", () => {
		const m = new Measure();
		expect(m).toBeInstanceOf(THREE.Object3D);
		expect(m.name).toMatch(/^Measure_\d+$/);
		expect(m.points).toHaveLength(0);
	});

	it("wraps a Vector3 marker into a { position } point and fires marker_added", () => {
		const m = new Measure();
		let added = 0;
		(m as any).addEventListener("marker_added", () => added++);

		m.addMarker(v(1, 2, 3));

		expect(m.points).toHaveLength(1);
		expect(m.points[0].position).toBeInstanceOf(THREE.Vector3);
		expect(m.points[0].position.toArray()).toEqual([1, 2, 3]);
		expect(m.spheres).toHaveLength(1);
		expect(added).toBe(1);
	});

	it("wraps an array marker into a Vector3", () => {
		const m = new Measure();
		m.addMarker([5, 6, 7]);
		expect(m.points[0].position.toArray()).toEqual([5, 6, 7]);
	});

	it("computes area and total distance through the extracted math", () => {
		const m = triangle();
		expect(m.getArea()).toBeCloseTo(6, 10);
		// closed by default: 4 + 5 + 3
		expect(m.getTotalDistance()).toBeCloseTo(12, 10);
		m.closed = false;
		expect(m.getTotalDistance()).toBeCloseTo(9, 10);
	});

	it("computes the interior angle at a vertex", () => {
		const m = triangle();
		// at (4,0,0): rays to (0,0,0) and (0,3,0) → acos(0.8)
		expect(m.getAngle(1)).toBeCloseTo(Math.acos(0.8), 6);
	});

	it("toggling display flags re-runs update without throwing", () => {
		const m = triangle();
		expect(() => {
			m.showArea = true;
			m.showAngles = true;
			m.showHeight = true;
			m.showCircle = true;
		}).not.toThrow();
	});
});
