import { describe, it, expect } from "vitest";

import { closeIconPath } from "../messageUtils";

describe("closeIconPath", () => {
	it("appends the icon path to the resource base", () => {
		expect(closeIconPath("/potree")).toBe("/potree/icons/close.svg");
		expect(closeIconPath("")).toBe("/icons/close.svg");
		expect(closeIconPath("http://x/build")).toBe("http://x/build/icons/close.svg");
	});
});
