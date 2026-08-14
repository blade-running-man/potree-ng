import { describe, it, expect, vi } from "vitest";

vi.mock("../../../utils", () => ({ Utils: { mouseToRay: () => ({ origin: {}, direction: {} }) } }));

import { ScreenBoxSelectTool } from "../ScreenBoxSelectTool";
import { EventDispatcher } from "../../../EventDispatcher";

describe("ScreenBoxSelectTool", () => {
	it("constructs with a minimal viewer stub", () => {
		const tool = new ScreenBoxSelectTool({ addEventListener: () => {} });
		expect(tool).toBeInstanceOf(EventDispatcher);
		expect(tool.startInsertion).toBeTypeOf("function");
	});
});
