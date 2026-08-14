import { describe, it, expect } from "vitest";
import * as THREE from "three";

import { SpotLightHelper } from "../SpotLightHelper";
import { computeConeScale } from "../spotLightHelperMath";

describe("SpotLightHelper", () => {
	it("constructs a sphere + frustum for a spotlight without WebGL", () => {
		const light = new THREE.SpotLight(0xffffff, 1, 10, Math.PI / 6);
		light.position.set(1, 2, 3);

		const helper = new SpotLightHelper(light);

		expect(helper).toBeInstanceOf(THREE.Object3D);
		expect(helper.children).toHaveLength(2);
		expect(helper.sphere).toBeInstanceOf(THREE.Mesh);
		expect(helper.frustum).toBeInstanceOf(THREE.LineSegments);

		// positioned at the light and scaled to the cone
		expect(helper.position.toArray()).toEqual([1, 2, 3]);
		const { coneWidth, coneLength } = computeConeScale(Math.PI / 6, 10);
		expect(helper.frustum.scale.x).toBeCloseTo(coneWidth, 6);
		expect(helper.frustum.scale.y).toBeCloseTo(coneWidth, 6);
		expect(helper.frustum.scale.z).toBeCloseTo(coneLength, 6);
	});
});
