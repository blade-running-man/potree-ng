import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";

// TextSprite renders text onto a 2D canvas, which is unavailable in the test
// environment. Stub it with a minimal Object3D so Volume can be constructed.
vi.mock("../../../TextSprite", async () => {
	const T = await import("three");
	class TextSprite extends T.Object3D {
		material: Record<string, unknown> = {};
		constructor(_text?: string) {
			super();
		}
		setBorderColor() {}
		setBackgroundColor() {}
	}
	return { TextSprite };
});

import { Volume, BoxVolume, SphereVolume } from "../Volume";

describe("BoxVolume", () => {
	it("constructs with box + frame children and a box_N name", () => {
		const vol = new BoxVolume();
		expect(vol).toBeInstanceOf(Volume);
		expect(vol.name).toMatch(/^box_\d+$/);
		expect(vol.box).toBeInstanceOf(THREE.Mesh);
		expect(vol.frame).toBeInstanceOf(THREE.LineSegments);
		expect(vol.frame.geometry.getAttribute("position").count).toBe(24);
	});

	it("computes box volume from the scale", () => {
		const vol = new BoxVolume();
		expect(vol.getVolume()).toBe(1);
		vol.scale.set(2, 3, 4);
		expect(vol.getVolume()).toBe(24);
		vol.scale.set(-2, 3, 4);
		expect(vol.getVolume()).toBe(24);
	});

	it("fires visibility_changed only on an actual change", () => {
		const vol = new BoxVolume();
		let fired = 0;
		(vol as any).addEventListener("visibility_changed", () => fired++);

		vol.visible = false;
		vol.visible = false; // no change → no event
		vol.visible = true;

		expect(fired).toBe(2);
		expect(vol.visible).toBe(true);
	});

	it("fires clip_changed when clip toggles", () => {
		const vol = new BoxVolume();
		let fired = 0;
		(vol as any).addEventListener("clip_changed", () => fired++);

		vol.clip = true;
		vol.clip = true; // no change
		expect(fired).toBe(1);
		expect(vol.clip).toBe(true);
	});

	it("honours modifiable:false and exposes the deprecated alias", () => {
		expect(new BoxVolume().modifiable).toBe(true); // default
		const locked = new BoxVolume({ modifiable: false });
		expect(locked.modifiable).toBe(false);
		expect(locked.modifieable).toBe(false);

		locked.modifieable = true;
		expect(locked.modifiable).toBe(true);
	});
});

describe("SphereVolume", () => {
	it("constructs with a sphere + frame and a sphere_N name", () => {
		const vol = new SphereVolume();
		expect(vol).toBeInstanceOf(Volume);
		expect(vol.name).toMatch(/^sphere_\d+$/);
		expect(vol.sphere).toBeInstanceOf(THREE.Mesh);
		expect(vol.frame).toBeInstanceOf(THREE.LineSegments);
		expect(vol.frame.geometry.getAttribute("position").count).toBe(1950);
	});

	it("computes ellipsoid volume from the scale (abs)", () => {
		const vol = new SphereVolume();
		expect(vol.getVolume()).toBeCloseTo((4 / 3) * Math.PI, 10);
		vol.scale.set(-1, 1, 1);
		expect(vol.getVolume()).toBeCloseTo((4 / 3) * Math.PI, 10);
	});
});
