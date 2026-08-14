import { describe, it, expect } from "vitest";

import { azimuthToCssTransform } from "../compassMath";

describe("azimuthToCssTransform", () => {
	it("negates the azimuth into a rotateZ transform", () => {
		expect(azimuthToCssTransform(0)).toBe("rotateZ(0rad)");
		expect(azimuthToCssTransform(Math.PI)).toBe(`rotateZ(${-Math.PI}rad)`);
		expect(azimuthToCssTransform(-Math.PI / 2)).toBe(`rotateZ(${Math.PI / 2}rad)`);
	});
});
