import { describe, it, expect } from "vitest";
import * as THREE from "three";

import { PolygonClipVolume } from "../PolygonClipVolume";

function makeCamera(): THREE.PerspectiveCamera {
	const cam = new THREE.PerspectiveCamera(50, 1.5, 0.1, 100);
	cam.position.set(1, 2, 3);
	cam.rotation.set(0.1, 0.2, 0.3);
	cam.updateMatrixWorld(true);
	cam.updateProjectionMatrix();
	return cam;
}

function expectMatrixClose(a: THREE.Matrix4, b: THREE.Matrix4) {
	for (let i = 0; i < 16; i++) {
		expect(a.elements[i]).toBeCloseTo(b.elements[i], 6);
	}
}

describe("PolygonClipVolume", () => {
	it("is an Object3D with a generated, incrementing name", () => {
		const a = new PolygonClipVolume(makeCamera());
		const b = new PolygonClipVolume(makeCamera());
		expect(a).toBeInstanceOf(THREE.Object3D);
		expect(a.name).toMatch(/^polygon_clip_volume_\d+$/);
		const na = Number(a.name.split("_").pop());
		const nb = Number(b.name.split("_").pop());
		expect(nb).toBe(na + 1);
	});

	it("captures the camera's view and projection matrices (as clones)", () => {
		const cam = makeCamera();
		const pcv = new PolygonClipVolume(cam);

		// view matrix is the inverse of the camera world matrix
		expectMatrixClose(pcv.viewMatrix, cam.matrixWorldInverse);
		expectMatrixClose(pcv.projMatrix, cam.projectionMatrix);

		// stored as clones, not references, and decoupled from the source camera
		expect(pcv.viewMatrix).not.toBe(cam.matrixWorldInverse);
		expect(pcv.camera).not.toBe(cam);
	});

	it("starts uninitialised with no markers and supports add/remove", () => {
		const pcv = new PolygonClipVolume(makeCamera());
		expect(pcv.initialized).toBe(false);
		expect(pcv.markers).toHaveLength(0);

		pcv.addMarker();
		pcv.addMarker();
		expect(pcv.markers).toHaveLength(2);

		pcv.removeLastMarker();
		expect(pcv.markers).toHaveLength(1);

		pcv.removeLastMarker();
		pcv.removeLastMarker(); // no-op when empty
		expect(pcv.markers).toHaveLength(0);
	});
});
