import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { Utils } from "../utils";

// Utils.createBackgroundTexture builds the always-present background plane
// texture, which must be RGBA. three uploads textures with texStorage2D, which
// requires a *sized* internal format: RGBA + UNSIGNED_BYTE maps to the sized
// RGBA8, whereas an unsized RGB texture is rejected by texStorage2D.

describe("Utils.createBackgroundTexture", () => {
	it("produces an RGBA (sized) texture, not deprecated RGB", () => {
		const width = 4;
		const height = 4;
		const tex = Utils.createBackgroundTexture(width, height);

		expect(tex.format).toBe(THREE.RGBAFormat);
		expect((tex.image.data as Uint8Array).length).toBe(width * height * 4);
	});

	it("fills an opaque alpha channel", () => {
		const tex = Utils.createBackgroundTexture(4, 4);
		const data = tex.image.data as Uint8Array;
		for (let i = 3; i < data.length; i += 4) {
			expect(data[i]).toBe(255);
		}
	});
});
