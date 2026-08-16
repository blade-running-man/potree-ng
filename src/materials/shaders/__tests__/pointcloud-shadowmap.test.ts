import { describe, it, expect } from "vitest";
import { Shaders } from "../index";

// pointcloud.vs is compiled by Potree's custom raw-GL renderer as
// `#version 300 es` (GLSL ES 3.00 / WebGL2), under which an array of samplers
// may only be indexed by a constant integral expression — a literal like
// `uShadowMap[0]`, never a loop variable like `uShadowMap[i]` (a loop variable
// fails to compile: "array index for samplers must be constant integral
// expressions"). This test encodes that rule so any sampler array — present or
// future — is guarded, not just uShadowMap.
// Consume the shader exactly as the app does (raw string via ?raw), so the
// test sees the same source the renderer compiles.
const source: string = Shaders["pointcloud.vs"];

// The indexing rule applies to code, not comments — strip both comment styles
// so a `uShadowMap[i]` mention in a comment isn't flagged. GLSL has no string
// literals, so this is safe. Line breaks are preserved so declarations stay
// distinguishable per line.
const code = source
	.replace(/\/\*[\s\S]*?\*\//g, (m: string) => m.replace(/[^\n]/g, " "))
	.replace(/\/\/[^\n]*/g, "");

function lineContaining(index: number): string {
	const start = code.lastIndexOf("\n", index) + 1;
	const end = code.indexOf("\n", index);
	return code.slice(start, end === -1 ? undefined : end);
}

describe("pointcloud.vs sampler array indexing (GLSL ES 3.00)", () => {
	const samplerArrays = new Set<string>();
	for (const m of code.matchAll(/sampler2D\s+(\w+)\s*\[/g)) {
		samplerArrays.add(m[1]);
	}

	it("declares at least one sampler array (guards against a moved/renamed target)", () => {
		expect(samplerArrays.has("uShadowMap")).toBe(true);
	});

	it("indexes every sampler array only with a constant literal, never a variable", () => {
		const violations: string[] = [];
		for (const name of samplerArrays) {
			const useRe = new RegExp(`\\b${name}\\s*\\[\\s*([^\\]]+?)\\s*\\]`, "g");
			for (const m of code.matchAll(useRe)) {
				// Skip the declaration itself — there `[...]` is the array *size*.
				if (/sampler2D/.test(lineContaining(m.index!))) continue;
				const index = m[1].trim();
				if (!/^\d+$/.test(index)) {
					violations.push(`${name}[${index}]`);
				}
			}
		}
		expect(violations, `dynamic sampler indexing found: ${violations.join(", ")}`).toEqual([]);
	});

	it("reads the shadow map through the constant-index dispatch helper", () => {
		// The loop still iterates shadow maps (mat4 arrays may be indexed
		// dynamically in ES 3.00), but the sampler read must go through the
		// helper rather than uShadowMap[i].
		expect(source).toMatch(/sampleShadowMap\s*\(/);
		expect(source).not.toMatch(/texture\s*\(\s*uShadowMap\s*\[\s*i\s*\]/);
	});
});
