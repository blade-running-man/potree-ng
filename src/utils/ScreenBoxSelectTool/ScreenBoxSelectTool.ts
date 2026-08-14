import * as THREE from "three";
import { BoxVolume } from "../Volume";
import { Utils } from "../../utils";
import { PointSizeType } from "../../defines";
import { EventDispatcher } from "../../EventDispatcher";

import {
	screenCentroid,
	screenDeltaToWorldSize,
	rectFromPoints,
	buildVolumeFrustum,
	inverseRay,
	resolveBoxDepth,
} from "./screenBoxSelectMath";

export class ScreenBoxSelectTool extends EventDispatcher {

	viewer: any;
	scene: THREE.Scene;
	importance = 0;

	constructor (viewer: any) {
		super();

		this.viewer = viewer;
		this.scene = new THREE.Scene();

		viewer.addEventListener("update", this.update.bind(this));
		viewer.addEventListener("render.pass.perspective_overlay", this.render.bind(this));
		viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));
	}

	onSceneChange (_scene: any) {

	}

	startInsertion () {
		const domElement = this.viewer.renderer.domElement;

		const volume = new BoxVolume();
		volume.position.set(12345, 12345, 12345);
		volume.showVolumeLabel = false;
		volume.visible = false;
		volume.update();
		this.viewer.scene.addVolume(volume);

		this.importance = 10;

		const selectionBox = $(`<div style="position: absolute; border: 2px solid white; pointer-events: none; border-style:dashed"></div>`);
		$(domElement.parentElement).append(selectionBox);
		selectionBox.css("right", "10px");
		selectionBox.css("bottom", "10px");

		const drag = (e: any) => {

			volume.visible = true;

			const mStart = e.drag.start;
			const mEnd = e.drag.end;

			const rect = rectFromPoints(mStart, mEnd);
			selectionBox.css("left", `${rect.left}px`);
			selectionBox.css("top", `${rect.top}px`);
			selectionBox.css("width", `${rect.width}px`);
			selectionBox.css("height", `${rect.height}px`);

			const camera = e.viewer.scene.getActiveCamera();
			const size = e.viewer.renderer.getSize(new THREE.Vector2());
			const frustumSize = new THREE.Vector2(
				camera.right - camera.left,
				camera.top - camera.bottom);

			const centroid = screenCentroid(e.drag.end, e.drag.start);
			const ray = Utils.mouseToRay(centroid, camera, size.width, size.height);

			const diff = screenDeltaToWorldSize(e.drag.start, e.drag.end, size, frustumSize);

			volume.position.copy(ray.origin);
			volume.up.copy(camera.up);
			volume.rotation.copy(camera.rotation);
			volume.scale.set(diff.x, diff.y, 1000 * 100);

			e.consume();
		};

		const drop = (e: any) => {
			this.importance = 0;

			$(selectionBox).remove();

			this.viewer.inputHandler.deselectAll();
			this.viewer.inputHandler.toggleSelection(volume);

			const camera = e.viewer.scene.getActiveCamera();
			const size = e.viewer.renderer.getSize(new THREE.Vector2());
			const centroid = screenCentroid(e.drag.end, e.drag.start);
			const ray = Utils.mouseToRay(centroid, camera, size.width, size.height);

			this.removeEventListener("drag", drag);
			this.removeEventListener("drop", drop);

			const allPointsNear: any[] = [];
			const allPointsFar: any[] = [];

			// TODO support more than one point cloud
			for (const pointcloud of this.viewer.scene.pointclouds) {

				if (!pointcloud.visible) {
					continue;
				}

				const volCam = camera.clone();
				const frustum = buildVolumeFrustum(volume.scale);
				volCam.left = frustum.left;
				volCam.right = frustum.right;
				volCam.top = frustum.top;
				volCam.bottom = frustum.bottom;
				volCam.near = frustum.near;
				volCam.far = frustum.far;
				volCam.rotation.copy(volume.rotation);
				volCam.position.copy(volume.position);

				volCam.updateMatrix();
				volCam.updateMatrixWorld();
				volCam.updateProjectionMatrix();
				volCam.matrixWorldInverse.copy(volCam.matrixWorld).invert();

				const volRay = new THREE.Ray(volCam.getWorldPosition(new THREE.Vector3()), volCam.getWorldDirection(new THREE.Vector3()));
				const rayInverse = inverseRay(volRay, volume.scale.z);

				const pickerSettings = {
					width: 8,
					height: 8,
					pickWindowSize: 8,
					all: true,
					pickClipped: true,
					pointSizeType: PointSizeType.FIXED,
					pointSize: 1,
				};
				const pointsNear = pointcloud.pick(viewer, volCam, volRay, pickerSettings);

				volCam.rotateX(Math.PI);
				volCam.updateMatrix();
				volCam.updateMatrixWorld();
				volCam.updateProjectionMatrix();
				volCam.matrixWorldInverse.copy(volCam.matrixWorld).invert();
				const pointsFar = pointcloud.pick(viewer, volCam, rayInverse, pickerSettings);

				allPointsNear.push(...pointsNear);
				allPointsFar.push(...pointsFar);
			}

			const viewLine = new THREE.Line3(ray.origin, new THREE.Vector3().addVectors(ray.origin, ray.direction));
			const depth = resolveBoxDepth(
				allPointsNear.map((p) => p.position),
				allPointsFar.map((p) => p.position),
				viewLine,
				ray.origin);

			if (depth) {
				volume.scale.z = depth.distance * 1.1;
				volume.position.copy(depth.centroid);
			}

			volume.clip = true;
		};

		this.addEventListener("drag", drag);
		this.addEventListener("drop", drop);

		this.viewer.inputHandler.addInputListener(this);

		return volume;
	}

	update (_e?: any) {

	}

	render () {
		this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
	}

}
