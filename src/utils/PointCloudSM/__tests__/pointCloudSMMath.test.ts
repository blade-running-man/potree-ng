import { describe, it, expect } from "vitest";

import { lightToCameraParams } from "../pointCloudSMMath";

const light = (angle: number, distance: number, w: number, h: number) => ({
	angle,
	distance,
	shadow: { mapSize: { width: w, height: h } },
});

describe("lightToCameraParams", () => {
	it("derives fov/aspect/near/far from the light", () => {
		expect(lightToCameraParams(light(Math.PI / 4, 0, 1024, 1024))).toEqual({
			fov: 45,
			aspect: 1,
			near: 0.1,
			far: 10000,
		});
	});

	it("uses the light distance as far and a non-unit aspect", () => {
		const params = lightToCameraParams(light(Math.PI / 2, 250, 800, 600));
		expect(params.fov).toBeCloseTo(90, 10);
		expect(params.aspect).toBeCloseTo(800 / 600, 10);
		expect(params.near).toBe(0.1);
		expect(params.far).toBe(250);
	});

	it("falls back to 10000 far only when distance is exactly 0", () => {
		expect(lightToCameraParams(light(1, 0, 1, 1)).far).toBe(10000);
		expect(lightToCameraParams(light(1, 5, 1, 1)).far).toBe(5);
	});
});
