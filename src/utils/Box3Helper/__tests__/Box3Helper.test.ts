import { describe, it, expect } from "vitest";
import * as THREE from "three";

import { Box3Helper } from "../Box3Helper";

describe("Box3Helper", () => {
	const unitBox = new THREE.Box3(
		new THREE.Vector3(0, 0, 0),
		new THREE.Vector3(1, 1, 1),
	);

	it("constructs a LineSegments without a WebGL context", () => {
		const helper = new Box3Helper(unitBox);
		expect(helper).toBeInstanceOf(THREE.LineSegments);
	});

	it("builds geometry from the box corners", () => {
		const helper = new Box3Helper(unitBox);
		const position = helper.geometry.getAttribute("position");
		const index = helper.geometry.getIndex();

		expect(position.count).toBe(8);
		expect(Array.from(position.array)).toEqual([
			0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1,
			0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1,
		]);
		expect(index).not.toBeNull();
		expect(Array.from(index!.array)).toEqual([
			0, 1, 1, 2, 2, 3, 3, 0,
			4, 5, 5, 6, 6, 7, 7, 4,
			0, 4, 1, 5, 2, 6, 3, 7,
		]);
	});

	it("defaults to yellow and honours a custom color", () => {
		const yellow = new Box3Helper(unitBox);
		expect((yellow.material as THREE.LineBasicMaterial).color.getHex()).toBe(0xffff00);

		const red = new Box3Helper(unitBox, 0xff0000);
		expect((red.material as THREE.LineBasicMaterial).color.getHex()).toBe(0xff0000);
	});
});
