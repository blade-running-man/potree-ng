import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";

// Utils pulls in a heavy (and circular) module chain; the drag handler that
// uses it is not exercised here, so a tiny stub keeps the test isolated.
vi.mock("../../../utils", () => ({
	Utils: { getMousePointCloudIntersection: () => null },
}));

import { Profile } from "../Profile";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

describe("Profile", () => {
	it("constructs empty with a Profile_N name", () => {
		const p = new Profile();
		expect(p).toBeInstanceOf(THREE.Object3D);
		expect(p.name).toMatch(/^Profile_\d+$/);
		expect(p.points).toHaveLength(0);
		expect(p.getWidth()).toBe(1);
	});

	it("adds markers with spheres, edges and boxes", () => {
		const p = new Profile();
		p.addMarker(v(0, 0, 0));
		p.addMarker(v(1, 0, 0));
		p.addMarker(v(1, 1, 0));

		expect(p.points).toHaveLength(3);
		expect(p.spheres).toHaveLength(3);
		expect(p.edges).toHaveLength(2);
		expect(p.boxes).toHaveLength(2);
		// update() positioned sphere 0 at the first point
		expect(p.spheres[0].position.toArray()).toEqual([0, 0, 0]);
	});

	it("exposes segments and per-segment matrices", () => {
		const p = new Profile();
		p.addMarker(v(0, 0, 0));
		p.addMarker(v(4, 0, 0));

		const segments = p.getSegments();
		expect(segments).toHaveLength(1);
		expect(segments[0].start.toArray()).toEqual([0, 0, 0]);
		expect(segments[0].end.toArray()).toEqual([4, 0, 0]);

		expect(p.getSegmentMatrices()).toHaveLength(1);
	});

	it("fires marker_added for each marker", () => {
		const p = new Profile();
		let added = 0;
		(p as any).addEventListener("marker_added", () => added++);
		p.addMarker(v(0, 0, 0));
		p.addMarker(v(1, 0, 0));
		expect(added).toBe(2);
	});

	it("setWidth updates width and fires width_changed", () => {
		const p = new Profile();
		let fired = 0;
		(p as any).addEventListener("width_changed", () => fired++);
		p.setWidth(5);
		expect(p.getWidth()).toBe(5);
		expect(fired).toBe(1);
	});

	it("removes the last marker and its edge/box", () => {
		const p = new Profile();
		p.addMarker(v(0, 0, 0));
		p.addMarker(v(1, 0, 0));
		expect(p.edges).toHaveLength(1);

		p.removeMarker(1);
		expect(p.points).toHaveLength(1);
		expect(p.spheres).toHaveLength(1);
		expect(p.edges).toHaveLength(0);
		expect(p.boxes).toHaveLength(0);
	});
});
