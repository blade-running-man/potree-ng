import { describe, it, expect } from "vitest";

import { resolveInsertionAction } from "../annotationToolMath";

describe("resolveInsertionAction", () => {
	// THREE.MOUSE.LEFT === 0, RIGHT === 2
	it("maps the left button to finish", () => {
		expect(resolveInsertionAction(0, 0, 2)).toBe("finish");
	});

	it("maps the right button to cancel", () => {
		expect(resolveInsertionAction(2, 0, 2)).toBe("cancel");
	});

	it("maps any other button to none", () => {
		expect(resolveInsertionAction(1, 0, 2)).toBe("none");
	});
});
