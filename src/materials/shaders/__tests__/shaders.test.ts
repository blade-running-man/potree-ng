import { describe, it, expect } from "vitest";
import { Shaders } from "../index";

// Folder-wide guards for src/materials/shaders. These lock in the standards the
// shaders must meet under three r185 / WebGL2 (GLSL ES 3.00) so a future edit
// can't silently regress them. Complements pointcloud-shadowmap.test.ts, which
// covers the sampler-array indexing rule specifically.

/** GLSL has no string literals, so stripping comments is safe. Line breaks are
 *  preserved so line-anchored checks stay meaningful. */
function stripComments(src: string): string {
	return src
		.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
		.replace(/\/\/[^\n]*/g, "");
}

const EXPECTED_KEYS = [
	"pointcloud.vs",
	"pointcloud.fs",
	"edl.vs",
	"edl.fs",
	"normalize.vs",
	"normalize.fs",
	"normalize_and_edl.fs",
] as const;

// Shaders compiled by Potree's raw-GL renderer must carry `#version 300 es` as
// their first source line (the renderer bypasses three, which would otherwise
// inject it). Shaders rendered through three's WebGLRenderer must NOT declare a
// version in-source — three prepends it from `glslVersion = GLSL3`, and a second
// `#version` is a compile error.
const RAW_GL_SHADERS = ["pointcloud.vs", "pointcloud.fs"] as const;
const THREE_MANAGED_SHADERS = [
	"edl.vs",
	"edl.fs",
	"normalize.vs",
	"normalize.fs",
	"normalize_and_edl.fs",
] as const;

// Constructs that only exist in GLSL ES 1.00 (WebGL1). Their presence in a live
// shader means it would fail to compile under the `#version 300 es` these
// materials now use.
const LEGACY_GLSL1 = [
	{ name: "attribute", re: /\battribute\b/ },
	{ name: "varying", re: /\bvarying\b/ },
	{ name: "texture2D(", re: /\btexture2D\s*\(/ },
	{ name: "textureCube(", re: /\btextureCube\s*\(/ },
	{ name: "gl_FragColor", re: /\bgl_FragColor\b/ },
	{ name: "gl_FragDepthEXT", re: /\bgl_FragDepthEXT\b/ },
];

describe("Shaders barrel", () => {
	it("exposes exactly the expected shader keys", () => {
		expect(Object.keys(Shaders).sort()).toEqual([...EXPECTED_KEYS].sort());
	});

	it("every shader is a non-empty source string", () => {
		for (const key of EXPECTED_KEYS) {
			const src = Shaders[key];
			expect(typeof src, key).toBe("string");
			expect(src.trim().length, key).toBeGreaterThan(0);
		}
	});
});

describe("GLSL ES 3.00 / WebGL2 compliance", () => {
	it("no live shader uses a GLSL ES 1.00-only construct", () => {
		const violations: string[] = [];
		for (const key of EXPECTED_KEYS) {
			const code = stripComments(Shaders[key]);
			for (const { name, re } of LEGACY_GLSL1) {
				if (re.test(code)) violations.push(`${key}: ${name}`);
			}
		}
		expect(violations, `legacy GLSL1 constructs: ${violations.join(", ")}`).toEqual([]);
	});

	it("raw-GL shaders declare #version 300 es as their first line", () => {
		for (const key of RAW_GL_SHADERS) {
			expect(Shaders[key].startsWith("#version 300 es"), key).toBe(true);
		}
	});

	it("three-managed shaders do not declare a #version in-source", () => {
		for (const key of THREE_MANAGED_SHADERS) {
			expect(stripComments(Shaders[key]), key).not.toMatch(/#version/);
		}
	});
});

describe("structural integrity", () => {
	// A cheap guard against edits (e.g. removing commented-out code) that
	// accidentally drop a brace or paren. Counts on comment-stripped source
	// since GLSL has no string literals to confuse the count.
	function balance(src: string, open: string, close: string): number {
		const code = stripComments(src);
		let depth = 0;
		for (const ch of code) {
			if (ch === open) depth++;
			else if (ch === close) depth--;
		}
		return depth;
	}

	it("every shader has balanced braces and parentheses", () => {
		for (const key of EXPECTED_KEYS) {
			expect(balance(Shaders[key], "{", "}"), `${key} braces`).toBe(0);
			expect(balance(Shaders[key], "(", ")"), `${key} parens`).toBe(0);
		}
	});
});

describe("no dead preprocessor blocks", () => {
	it("pointcloud.fs has no empty #if defined paraboloid_point_shape block", () => {
		expect(Shaders["pointcloud.fs"]).not.toMatch(
			/#if\s+defined\s+paraboloid_point_shape\s*\n\s*#endif/,
		);
	});
});
