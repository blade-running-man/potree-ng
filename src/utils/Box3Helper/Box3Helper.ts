/**
 *
 * code adapted from three.js BoxHelper.js
 * https://github.com/mrdoob/three.js/blob/dev/src/helpers/BoxHelper.js
 *
 * @author mrdoob / http://mrdoob.com/
 * @author Mugen87 / http://github.com/Mugen87
 * @author mschuetz / http://potree.org
 */

import * as THREE from "three";

import { boxEdgePositions, boxEdgeIndices } from "./box3HelperMath";

export class Box3Helper extends THREE.LineSegments {
	constructor (box: THREE.Box3, color: THREE.ColorRepresentation = 0xffff00) {
		const indices = boxEdgeIndices();
		const positions = boxEdgePositions(box.min, box.max);

		const geometry = new THREE.BufferGeometry();
		geometry.setIndex(new THREE.BufferAttribute(indices, 1));
		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

		const material = new THREE.LineBasicMaterial({ color: color });

		super(geometry, material);
	}
}
