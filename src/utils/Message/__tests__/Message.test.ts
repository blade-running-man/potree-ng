import { describe, it, expect } from "vitest";

// Message is a jQuery/DOM view; constructing it needs jQuery + a DOM. This
// smoke test only verifies the module (and its barrel) load and export the
// class — the pure logic is covered by messageUtils.test.ts.
import { Message } from "../Message";

describe("Message", () => {
	it("exports a constructable class", () => {
		expect(Message).toBeTypeOf("function");
		expect(Message.prototype.setMessage).toBeTypeOf("function");
	});
});
