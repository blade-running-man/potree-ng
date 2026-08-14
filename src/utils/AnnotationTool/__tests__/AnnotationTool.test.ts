import { describe, it, expect, vi } from "vitest";

// Isolate from the heavy Annotation/Utils module chains; startInsertion (which
// uses them) is not exercised in this construction smoke test.
vi.mock("../../../Annotation", () => ({ Annotation: class {} }));
vi.mock("../../../utils", () => ({ Utils: { getMousePointCloudIntersection: () => null } }));

import { AnnotationTool } from "../AnnotationTool";
import { EventDispatcher } from "../../../EventDispatcher";

describe("AnnotationTool", () => {
	it("constructs with a minimal viewer stub", () => {
		const tool = new AnnotationTool({ renderer: {} });
		expect(tool).toBeInstanceOf(EventDispatcher);
		expect(tool.startInsertion).toBeTypeOf("function");
	});
});
