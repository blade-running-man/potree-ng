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
	// EptBinaryLoader reads `Key` / `Bounds` from the `window.Copc` global that
	// libs/copc/index.js installs in the browser; stub the bits we use.
	(globalThis as unknown as { window: unknown }).window = {
		Copc: {
			Key: { toString: (key: number[]) => key.join("-") },
			// bounds are [minx, miny, minz, maxx, maxy, maxz]
			Bounds: { min: (b: number[]) => [b[0], b[1], b[2]] },
		},
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

describe("EptBinaryLoader.workerMessage", () => {
	// The decoder (parseEpt) applies `raw * scale.{x,y,z} + offset.{x,y,z} - mins`.
	// The EPT metadata lives on the geometry (node.owner.ept); XYZ scale/offset are
	// per-dimension in the schema here, and mins is the node's bounds minimum.
	const eptNode = {
		owner: {
			ept: {
				schema: [
					{ name: "X", scale: 0.001, offset: -2, size: 4, type: "signed" },
					{ name: "Y", scale: 0.001, offset: 4, size: 4, type: "signed" },
					{ name: "Z", scale: 0.001, offset: -1, size: 4, type: "signed" },
					{ name: "Intensity", size: 2, type: "unsigned" },
				],
			},
		},
		bounds: [10, 20, 30, 40, 50, 60],
	};

	it("sources schema/scale/offset from the geometry and mins from node bounds", () => {
		const buffer = new ArrayBuffer(8);
		const msg = new EptBinaryLoader().workerMessage(eptNode, buffer);

		expect(msg.buffer).toBe(buffer);
		expect(msg.schema).toBe(eptNode.owner.ept.schema);
		expect(msg.scale).toEqual({ x: 0.001, y: 0.001, z: 0.001 });
		expect(msg.offset).toEqual({ x: -2, y: 4, z: -1 });
		expect(msg.mins).toEqual([10, 20, 30]);
	});

	it("falls back to top-level ept scale/offset arrays when the schema omits them", () => {
		const legacyNode = {
			owner: {
				ept: {
					schema: [
						{ name: "X", size: 4, type: "signed" },
						{ name: "Y", size: 4, type: "signed" },
						{ name: "Z", size: 4, type: "signed" },
					],
					scale: [0.01, 0.02, 0.03],
					offset: [100, 200, 300],
				},
			},
			bounds: [1, 2, 3, 4, 5, 6],
		};

		const msg = new EptBinaryLoader().workerMessage(legacyNode, new ArrayBuffer(4));
		expect(msg.scale).toEqual({ x: 0.01, y: 0.02, z: 0.03 });
		expect(msg.offset).toEqual({ x: 100, y: 200, z: 300 });
	});
});
