import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { EptBinaryLoader } from "../BinaryLoader";
import { EptZstandardLoader } from "../ZstandardLoader";

// Regression for: `TypeError: node.url is not a function` on
// examples/ept_binary.html. The EPT loaders now build PointCloudCopcGeometryNode
// (no `url()` method); EptBinaryLoader.load() must derive the data URL the same
// way EptLaszipLoader does — `${owner.base}/ept-data/${Key.toString(key)}` plus
// the per-loader extension (.bin / .zst). EptZstandardLoader extends
// EptBinaryLoader and only overrides extension(), so this covers both.

beforeAll(() => {
	// EptBinaryLoader reads the `Key` helper from the `window.Copc` global that
	// libs/copc/index.js installs in the browser; stub the bit we use.
	(globalThis as unknown as { window: unknown }).window = {
		Copc: { Key: { toString: (key: number[]) => key.join("-") } },
	};
});

afterAll(() => {
	delete (globalThis as unknown as { window?: unknown }).window;
});

const node = { owner: { base: "http://host/cloud" }, key: [3, 1, 2, 0] };

describe("EptBinaryLoader.nodeUrl", () => {
	it("builds the ept-data URL with the .bin extension", () => {
		expect(new EptBinaryLoader().nodeUrl(node)).toBe(
			"http://host/cloud/ept-data/3-1-2-0.bin",
		);
	});

	it("EptZstandardLoader inherits it with the .zst extension", () => {
		expect(new EptZstandardLoader().nodeUrl(node)).toBe(
			"http://host/cloud/ept-data/3-1-2-0.zst",
		);
	});
});
