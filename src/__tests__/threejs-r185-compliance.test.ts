import { describe, it, expect } from "vitest";
import potreeRendererSrc from "../PotreeRenderer.js?raw";
import pointCloudMaterialSrc from "../materials/PointCloudMaterial.js?raw";
import cameraAnimationSrc from "../modules/CameraAnimation/CameraAnimation.js?raw";
import measuringToolSrc from "../utils/MeasuringTool/MeasuringTool.ts?raw";
import orientedImagesSrc from "../modules/OrientedImages/OrientedImages.js?raw";

// Guards the cleaned-up files against reintroducing three.js APIs that are
// removed or invalid under the three version this project uses.

describe("PotreeRenderer.paramThreeToGL uses only r185 constants", () => {
	it("does not reference the removed THREE.RGBFormat", () => {
		expect(potreeRendererSrc).not.toMatch(/THREE\.RGBFormat/);
	});

	it("uses modern 'Mipmap' filter casing, not the legacy 'MipMap' aliases", () => {
		expect(potreeRendererSrc).not.toMatch(/MipMap/);
	});
});

describe("PointCloudMaterial gradient texture uses valid Texture APIs", () => {
	it("does not set the non-existent texture.wrap property", () => {
		expect(pointCloudMaterialSrc).not.toMatch(/\.wrap\s*=/);
	});

	it("does not overwrite texture.repeat (a Vector2) with a number", () => {
		expect(pointCloudMaterialSrc).not.toMatch(/\.repeat\s*=\s*\d/);
	});
});

describe("no legacy THREE.Geometry flags on BufferGeometry / fat lines", () => {
	it("CameraAnimation has no no-op verticesNeedUpdate", () => {
		expect(cameraAnimationSrc).not.toMatch(/verticesNeedUpdate/);
	});

	it("MeasuringTool has no no-op lineDistances / lineDistancesNeedUpdate", () => {
		expect(measuringToolSrc).not.toMatch(/lineDistancesNeedUpdate/);
		expect(measuringToolSrc).not.toMatch(/\.lineDistances\s*=/);
	});

	it("OrientedImages has no reference to the removed THREE.Geometry class", () => {
		expect(orientedImagesSrc).not.toMatch(/new THREE\.Geometry\(/);
	});
});
