import * as THREE from "three";

import { lightToCameraParams } from "./pointCloudSMMath";

export class PointCloudSM {

	potreeRenderer: any;
	threeRenderer: any;
	target: THREE.WebGLRenderTarget;
	light: any;
	camera!: THREE.PerspectiveCamera;

	constructor (potreeRenderer: any) {

		this.potreeRenderer = potreeRenderer;
		this.threeRenderer = this.potreeRenderer.threeRenderer;

		this.target = new THREE.WebGLRenderTarget(2 * 1024, 2 * 1024, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType,
		});
		this.target.depthTexture = new THREE.DepthTexture(2 * 1024, 2 * 1024);
		this.target.depthTexture.type = THREE.UnsignedIntType;

		this.threeRenderer.setClearColor(0xff0000, 1);

		{
			const oldTarget = this.threeRenderer.getRenderTarget();

			this.threeRenderer.setRenderTarget(this.target);
			this.threeRenderer.clear(true, true, true);

			this.threeRenderer.setRenderTarget(oldTarget);
		}
	}

	setLight (light: any) {
		this.light = light;

		const { fov, aspect, near, far } = lightToCameraParams(light);
		this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
		this.camera.up.set(0, 0, 1);
		this.camera.position.copy(light.position);

		const target = new THREE.Vector3().subVectors(light.position, light.getWorldDirection(new THREE.Vector3()));
		this.camera.lookAt(target);

		this.camera.updateProjectionMatrix();
		this.camera.updateMatrix();
		this.camera.updateMatrixWorld();
		this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
	}

	setSize (width: number, height: number) {
		if (this.target.width !== width || this.target.height !== height) {
			this.target.dispose();
		}
		this.target.setSize(width, height);
	}

	render (scene: any, _camera: any) {

		this.threeRenderer.setClearColor(0x000000, 1);

		const oldTarget = this.threeRenderer.getRenderTarget();

		this.threeRenderer.setRenderTarget(this.target);
		this.threeRenderer.clear(true, true, true);

		this.potreeRenderer.render(scene, this.camera, this.target, {});

		this.threeRenderer.setRenderTarget(oldTarget);
	}

}
