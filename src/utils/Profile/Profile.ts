import * as THREE from "three";
import { Utils } from "../../utils";

import {
	segmentsFromPoints,
	segmentBoxMatrix,
	segmentHorizontalLength,
	segmentCenter,
	profileBounds,
	boxZCenter,
} from "./profileMath";

export class Profile extends THREE.Object3D {

	private static counter = -1;

	points: THREE.Vector3[] = [];
	spheres: THREE.Mesh[] = [];
	edges: THREE.Line[] = [];
	boxes: THREE.Mesh[] = [];
	width = 1;
	height = 20;
	_modifiable = true;
	sphereGeometry: THREE.SphereGeometry;
	color: THREE.Color;
	lineColor: THREE.Color;

	constructor () {
		super();

		this.name = 'Profile_' + (++Profile.counter);

		this.sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
		this.color = new THREE.Color(0xff0000);
		this.lineColor = new THREE.Color(0xff0000);
	}

	createSphereMaterial () {
		return new THREE.MeshLambertMaterial({
			color: 0xff0000,
			depthTest: false,
			depthWrite: false,
		});
	}

	getSegments () {
		return segmentsFromPoints(this.points);
	}

	getSegmentMatrices () {
		const matrices: THREE.Matrix4[] = [];

		for (const { start, end } of this.getSegments()) {
			matrices.push(segmentBoxMatrix(start, end, this.width, 10000));
		}

		return matrices;
	}

	addMarker (point: THREE.Vector3) {
		this.points.push(point);

		const sphere = new THREE.Mesh(this.sphereGeometry, this.createSphereMaterial());

		this.add(sphere);
		this.spheres.push(sphere);

		// edges & boxes
		if (this.points.length > 1) {
			const lineGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
			lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute([
				this.lineColor.r, this.lineColor.g, this.lineColor.b,
				this.lineColor.r, this.lineColor.g, this.lineColor.b,
			], 3));
			const lineMaterial = new THREE.LineBasicMaterial({
				vertexColors: true,
				linewidth: 2,
				transparent: true,
				opacity: 0.4,
			});
			lineMaterial.depthTest = false;
			const edge = new THREE.Line(lineGeometry, lineMaterial);
			edge.visible = false;

			this.add(edge);
			this.edges.push(edge);

			const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
			const boxMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.2 });
			const box = new THREE.Mesh(boxGeometry, boxMaterial);
			box.visible = false;

			this.add(box);
			this.boxes.push(box);
		}

		{ // event listeners (Potree custom drag/drop events → dynamic payloads)
			const drag = (e: any) => {
				const I: any = Utils.getMousePointCloudIntersection(
					e.drag.end,
					e.viewer.scene.getActiveCamera(),
					e.viewer,
					e.viewer.scene.pointclouds);

				if (I) {
					const i = this.spheres.indexOf(e.drag.object);
					if (i !== -1) {
						this.setPosition(i, I.location);
					}
				}
			};

			const drop = (e: any) => {
				const i = this.spheres.indexOf(e.drag.object);
				if (i !== -1) {
					(this as any).dispatchEvent({
						type: 'marker_dropped',
						profile: this,
						index: i,
					});
				}
			};

			const mouseover = (e: any) => e.object.material.emissive.setHex(0x888888);
			const mouseleave = (e: any) => e.object.material.emissive.setHex(0x000000);

			(sphere as any).addEventListener('drag', drag);
			(sphere as any).addEventListener('drop', drop);
			(sphere as any).addEventListener('mouseover', mouseover);
			(sphere as any).addEventListener('mouseleave', mouseleave);
		}

		(this as any).dispatchEvent({
			type: 'marker_added',
			profile: this,
			sphere: sphere,
		});

		this.setPosition(this.points.length - 1, point);
	}

	removeMarker (index: number) {
		this.points.splice(index, 1);

		this.remove(this.spheres[index]);

		const edgeIndex = (index === 0) ? 0 : (index - 1);
		this.remove(this.edges[edgeIndex]);
		this.edges.splice(edgeIndex, 1);
		this.remove(this.boxes[edgeIndex]);
		this.boxes.splice(edgeIndex, 1);

		this.spheres.splice(index, 1);

		this.update();

		(this as any).dispatchEvent({
			type: 'marker_removed',
			profile: this,
		});
	}

	setPosition (index: number, position: THREE.Vector3) {
		const point = this.points[index];
		point.copy(position);

		(this as any).dispatchEvent({
			type: 'marker_moved',
			profile: this,
			index: index,
			position: point.clone(),
		});

		this.update();
	}

	setWidth (width: number) {
		this.width = width;

		(this as any).dispatchEvent({
			type: 'width_changed',
			profile: this,
			width: width,
		});

		this.update();
	}

	getWidth () {
		return this.width;
	}

	update () {
		if (this.points.length === 0) {
			return;
		} else if (this.points.length === 1) {
			const point = this.points[0];
			this.spheres[0].position.copy(point);

			return;
		}

		const { min, max } = profileBounds(this.points);
		const lastIndex = this.points.length - 1;
		for (let i = 0; i <= lastIndex; i++) {
			const point = this.points[i];
			const sphere = this.spheres[i];
			const leftIndex = (i === 0) ? lastIndex : i - 1;
			const leftVertex = this.points[leftIndex];
			const leftEdge = this.edges[leftIndex];
			const rightEdge = this.edges[i];
			const leftBox = this.boxes[leftIndex];

			sphere.position.copy(point);

			sphere.visible = this._modifiable;

			if (leftEdge) {
				const pos = leftEdge.geometry.attributes.position as THREE.BufferAttribute;
				pos.setXYZ(1, point.x, point.y, point.z);
				pos.needsUpdate = true;
				leftEdge.geometry.computeBoundingSphere();
			}

			if (rightEdge) {
				const pos = rightEdge.geometry.attributes.position as THREE.BufferAttribute;
				pos.setXYZ(0, point.x, point.y, point.z);
				pos.needsUpdate = true;
				rightEdge.geometry.computeBoundingSphere();
			}

			if (leftBox) {
				const start = leftVertex;
				const end = point;
				leftBox.scale.set(segmentHorizontalLength(start, end), 1000000, this.width);
				leftBox.up.set(0, 0, 1);

				const center = segmentCenter(start, end);
				const diff = new THREE.Vector3().subVectors(end, start);
				const target = new THREE.Vector3(diff.y, -diff.x, 0);

				leftBox.position.set(0, 0, 0);
				leftBox.lookAt(target);
				leftBox.position.copy(center);
			}
		}

		for (let i = 0; i < this.boxes.length; i++) {
			this.boxes[i].position.z = boxZCenter(min.z, max.z);
		}
	}

	raycast (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
		for (let i = 0; i < this.points.length; i++) {
			const sphere = this.spheres[i];

			sphere.raycast(raycaster, intersects);
		}

		intersects.sort((a, b) => a.distance - b.distance);
	}

	get modifiable () {
		return this._modifiable;
	}

	set modifiable (value) {
		this._modifiable = value;
		this.update();
	}

}
