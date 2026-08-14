import { describe, it, expect } from "vitest";

import { boxEdgePositions, boxEdgeIndices } from "../box3HelperMath";

describe("boxEdgePositions", () => {
	it("expands a unit box into 24 floats in corner order", () => {
		const positions = boxEdgePositions({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 });
		expect(positions).toBeInstanceOf(Float32Array);
		expect(positions.length).toBe(24);
		expect(Array.from(positions)).toEqual([
			0, 0, 0, // v0 min
			1, 0, 0, // v1 +x
			1, 0, 1, // v2 +x +z
			0, 0, 1, // v3 +z
			0, 1, 0, // v4 +y
			1, 1, 0, // v5 +x +y
			1, 1, 1, // v6 max
			0, 1, 1, // v7 +y +z
		]);
	});

	it("places min on v0 and max on v6", () => {
		const positions = boxEdgePositions({ x: -2, y: -2, z: -2 }, { x: 2, y: 2, z: 2 });
		expect(Array.from(positions.slice(0, 3))).toEqual([-2, -2, -2]);
		expect(Array.from(positions.slice(18, 21))).toEqual([2, 2, 2]);
	});

	it("supports a non-cubic box", () => {
		const positions = boxEdgePositions({ x: 1, y: 2, z: 3 }, { x: 4, y: 6, z: 9 });
		// v1 = (max.x, min.y, min.z)
		expect(Array.from(positions.slice(3, 6))).toEqual([4, 2, 3]);
		// v7 = (min.x, max.y, max.z)
		expect(Array.from(positions.slice(21, 24))).toEqual([1, 6, 9]);
	});
});

describe("boxEdgeIndices", () => {
	it("returns the 24 fixed edge indices", () => {
		const indices = boxEdgeIndices();
		expect(indices).toBeInstanceOf(Uint16Array);
		expect(Array.from(indices)).toEqual([
			0, 1, 1, 2, 2, 3, 3, 0,
			4, 5, 5, 6, 6, 7, 7, 4,
			0, 4, 1, 5, 2, 6, 3, 7,
		]);
	});

	it("references only the 8 vertices and forms 12 unique undirected edges", () => {
		const indices = Array.from(boxEdgeIndices());
		expect(indices.length).toBe(24);
		expect(indices.every((i) => i >= 0 && i <= 7)).toBe(true);

		const edges = new Set<string>();
		for (let i = 0; i < indices.length; i += 2) {
			const [a, b] = [indices[i], indices[i + 1]].sort((x, y) => x - y);
			edges.add(`${a}-${b}`);
		}
		expect(edges.size).toBe(12);
	});
});
