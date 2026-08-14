import * as THREE from "three";

import { screenToNDC } from "./polygonClipVolumeMath";

type ClipCamera = THREE.PerspectiveCamera | THREE.OrthographicCamera;

export class PolygonClipVolume extends THREE.Object3D {

	private static counter = -1;

	camera: ClipCamera;
	viewMatrix: THREE.Matrix4;
	projMatrix: THREE.Matrix4;
	markers: THREE.Mesh[];
	initialized: boolean;

	constructor (camera: ClipCamera) {
		super();

		this.name = "polygon_clip_volume_" + (++PolygonClipVolume.counter);

		// Snapshot the camera so the polygon is interpreted in this camera's
		// screen space. `Object3D.clone()` copies the quaternion (the source of
		// truth for the world matrix) in three r125+, so the old r85 rotation
		// workaround is no longer needed. `Camera.updateMatrixWorld()` also
		// recomputes `matrixWorldInverse`, so no manual inversion is required.
		this.camera = camera.clone() as ClipCamera;
		this.camera.updateMatrixWorld();
		this.camera.updateProjectionMatrix();

		this.viewMatrix = this.camera.matrixWorldInverse.clone();
		this.projMatrix = this.camera.projectionMatrix.clone();

		// projected markers
		this.markers = [];
		this.initialized = false;
	}

	addMarker () {

		const marker = new THREE.Mesh();

		let cancel: (e?: unknown) => void;

		// `drag`/`drop` are Potree custom events (not three's typed event map);
		// the event payload is dynamic, hence the pragmatic `any`.
		const drag = (e: any) => {
			const size = e.viewer.renderer.getSize(new THREE.Vector2());
			const ndc = screenToNDC(e.drag.end.x, e.drag.end.y, size.width, size.height);
			marker.position.set(ndc.x, ndc.y, 0);
		};

		const drop = (_e: unknown) => {
			cancel();
		};

		cancel = () => {
			(marker as any).removeEventListener("drag", drag);
			(marker as any).removeEventListener("drop", drop);
		};

		(marker as any).addEventListener("drag", drag);
		(marker as any).addEventListener("drop", drop);

		this.markers.push(marker);
	}

	removeLastMarker () {
		if (this.markers.length > 0) {
			this.markers.pop();
		}
	}

}
