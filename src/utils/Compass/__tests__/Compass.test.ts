import { describe, it, expect, vi } from "vitest";

// Constructing Compass needs jQuery, a DOM and a full viewer; Utils pulls a
// heavy module chain. This smoke test only checks the module/barrel load.
vi.mock("../../../utils", () => ({ Utils: { computeAzimuth: () => 0 } }));

import { Compass } from "../Compass";

describe("Compass", () => {
	it("exports a constructable class", () => {
		expect(Compass).toBeTypeOf("function");
		expect(Compass.prototype.setVisible).toBeTypeOf("function");
	});
});
