import { describe, it, expect } from "vitest";

import { screenToNDC } from "../polygonClipVolumeMath";

describe("screenToNDC", () => {
	it("maps the viewport centre to the origin", () => {
		expect(screenToNDC(400, 300, 800, 600)).toEqual({ x: 0, y: 0 });
	});

	it("maps the top-left corner to (-1, 1)", () => {
		expect(screenToNDC(0, 0, 800, 600)).toEqual({ x: -1, y: 1 });
	});

	it("maps the bottom-right corner to (1, -1)", () => {
		expect(screenToNDC(800, 600, 800, 600)).toEqual({ x: 1, y: -1 });
	});

	it("maps a quarter position", () => {
		expect(screenToNDC(200, 150, 800, 600)).toEqual({ x: -0.5, y: 0.5 });
	});
});
