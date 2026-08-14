import * as THREE from "three";

import { computeConeScale, frustumPositions } from "./spotLightHelperMath";

export class SpotLightHelper extends THREE.Object3D {

	light: THREE.SpotLight;
	color?: THREE.ColorRepresentation;
	sphere: THREE.Mesh;
	frustum: THREE.LineSegments;

	constructor (light: THREE.SpotLight, color?: THREE.ColorRepresentation) {
		super();

		this.light = light;
		this.color = color;

		this.updateMatrix();
		this.updateMatrixWorld();

		{ // SPHERE
			const sg = new THREE.SphereGeometry(1, 32, 32);
			const sm = new THREE.MeshNormalMaterial();
			this.sphere = new THREE.Mesh(sg, sm);
			this.sphere.scale.set(0.5, 0.5, 0.5);
			this.add(this.sphere);
		}

		{ // LINES
			const geometry = new THREE.BufferGeometry();
			geometry.setAttribute("position", new THREE.BufferAttribute(frustumPositions(), 3));

			const material = new THREE.LineBasicMaterial();

			this.frustum = new THREE.LineSegments(geometry, material);
			this.add(this.frustum);
		}

		this.update();
	}

	update () {
		this.light.updateMatrix();
		this.light.updateMatrixWorld();

		const position = this.light.position;
		const target = new THREE.Vector3().addVectors(
			this.light.position, this.light.getWorldDirection(new THREE.Vector3()).multiplyScalar(-1));

		const quat = new THREE.Quaternion().setFromRotationMatrix(
			new THREE.Matrix4().lookAt(position, target, new THREE.Vector3(0, 0, 1)),
		);

		this.setRotationFromQuaternion(quat);
		this.position.copy(position);

		const { coneWidth, coneLength } = computeConeScale(this.light.angle, this.light.distance);

		this.frustum.scale.set(coneWidth, coneWidth, coneLength);
	}

}
