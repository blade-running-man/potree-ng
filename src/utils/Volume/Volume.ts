import * as THREE from "three";
import { TextSprite } from "../../TextSprite";

import {
	boxVolume,
	ellipsoidVolume,
	boundingSphereFromBox,
	unitBoxEdgeVertices,
	sphereFrameVertices,
} from "./volumeMath";

export interface VolumeArgs {
	clip?: boolean;
	modifiable?: boolean;
}

export class Volume extends THREE.Object3D {

	_clip: boolean;
	_visible: boolean;
	_modifiable: boolean;
	showVolumeLabel: boolean;
	label: any;
	boundingBox: THREE.Box3 | null = null;
	boundingSphere: THREE.Sphere | null = null;

	constructor (args: VolumeArgs = {}) {
		super();

		if (this.constructor.name === "Volume") {
			console.warn("Can't create object of class Volume directly. Use classes BoxVolume or SphereVolume instead.");
		}

		this._clip = args.clip || false;
		this._visible = true;
		this.showVolumeLabel = true;
		this._modifiable = args.modifiable ?? true;

		this.label = new TextSprite('0');
		this.label.setBorderColor({ r: 0, g: 255, b: 0, a: 0.0 });
		this.label.setBackgroundColor({ r: 0, g: 255, b: 0, a: 0.0 });
		this.label.material.depthTest = false;
		this.label.material.depthWrite = false;
		this.label.material.transparent = true;
		this.label.position.y -= 0.5;
		this.add(this.label);

		this.label.updateMatrixWorld = () => {
			const volumeWorldPos = new THREE.Vector3();
			volumeWorldPos.setFromMatrixPosition(this.matrixWorld);
			this.label.position.copy(volumeWorldPos);
			this.label.updateMatrix();
			this.label.matrixWorld.copy(this.label.matrix);
			this.label.matrixWorldNeedsUpdate = false;

			for (let i = 0, l = this.label.children.length; i < l; i++) {
				this.label.children[i].updateMatrixWorld(true);
			}
		};

		// `visible` is a plain field on Object3D; install an accessor via
		// defineProperty (rather than a class accessor, which conflicts with the
		// inherited field under TS) so assignments fire `visibility_changed`.
		Object.defineProperty(this, "visible", {
			configurable: true,
			enumerable: true,
			get: () => this._visible,
			set: (value: boolean) => {
				if (this._visible !== value) {
					this._visible = value;
					(this as any).dispatchEvent({ type: "visibility_changed", object: this });
				}
			},
		});

		{ // event listeners
			(this as any).addEventListener('select', () => {});
			(this as any).addEventListener('deselect', () => {});
		}
	}

	getVolume (): number {
		console.warn("override this in subclass");
		return 0;
	}

	update () {

	}

	raycast (_raycaster: THREE.Raycaster, _intersects: THREE.Intersection[]) {

	}

	get clip () {
		return this._clip;
	}

	set clip (value) {
		if (this._clip !== value) {
			this._clip = value;

			this.update();

			(this as any).dispatchEvent({
				type: "clip_changed",
				object: this,
			});
		}
	}

	get modifiable () {
		return this._modifiable;
	}

	set modifiable (value) {
		this._modifiable = value;

		this.update();
	}

	/** @deprecated misspelled alias of {@link modifiable}, kept for compatibility. */
	get modifieable () {
		return this.modifiable;
	}

	set modifieable (value) {
		this.modifiable = value;
	}
}


export class BoxVolume extends Volume {

	private static counter = -1;

	box: THREE.Mesh;
	material: THREE.MeshBasicMaterial;
	frame: THREE.LineSegments;

	constructor (args: VolumeArgs = {}) {
		super(args);

		this.name = 'box_' + (++BoxVolume.counter);

		const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
		boxGeometry.computeBoundingBox();

		const boxFrameGeometry = new THREE.BufferGeometry().setFromPoints(unitBoxEdgeVertices());

		this.material = new THREE.MeshBasicMaterial({
			color: 0x00ff00,
			transparent: true,
			opacity: 0.3,
			depthTest: true,
			depthWrite: false,
		});
		this.box = new THREE.Mesh(boxGeometry, this.material);
		this.box.geometry.computeBoundingBox();
		this.boundingBox = this.box.geometry.boundingBox;
		this.add(this.box);

		this.frame = new THREE.LineSegments(boxFrameGeometry, new THREE.LineBasicMaterial({ color: 0x000000 }));
		this.add(this.frame);

		this.update();
	}

	update () {
		this.boundingBox = this.box.geometry.boundingBox;
		if (this.boundingBox) {
			this.boundingSphere = boundingSphereFromBox(this.boundingBox);
		}

		if (this._clip) {
			this.box.visible = false;
			this.label.visible = false;
		} else {
			this.box.visible = true;
			this.label.visible = this.showVolumeLabel;
		}
	}

	raycast (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
		const is: THREE.Intersection[] = [];
		this.box.raycast(raycaster, is);

		if (is.length > 0) {
			const I = is[0];
			intersects.push({
				distance: I.distance,
				object: this,
				point: I.point.clone(),
			});
		}
	}

	getVolume () {
		return boxVolume(this.scale);
	}
}

export class SphereVolume extends Volume {

	private static counter = -1;

	sphere: THREE.Mesh;
	material: THREE.MeshBasicMaterial;
	frame: THREE.LineSegments;

	constructor (args: VolumeArgs = {}) {
		super(args);

		this.name = 'sphere_' + (++SphereVolume.counter);

		const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
		sphereGeometry.computeBoundingBox();

		this.material = new THREE.MeshBasicMaterial({
			color: 0x00ff00,
			transparent: true,
			opacity: 0.3,
			depthTest: true,
			depthWrite: false,
		});
		this.sphere = new THREE.Mesh(sphereGeometry, this.material);
		this.sphere.visible = false;
		this.sphere.geometry.computeBoundingBox();
		this.boundingBox = this.sphere.geometry.boundingBox;
		this.add(this.sphere);

		this.label.visible = false;

		const frameGeometry = new THREE.BufferGeometry().setFromPoints(sphereFrameVertices());
		this.frame = new THREE.LineSegments(frameGeometry, new THREE.LineBasicMaterial({ color: 0x000000 }));
		this.add(this.frame);

		this.update();
	}

	update () {
		this.boundingBox = this.sphere.geometry.boundingBox;
		if (this.boundingBox) {
			this.boundingSphere = boundingSphereFromBox(this.boundingBox);
		}

		// NOTE: clip-based visibility is intentionally left disabled here to
		// preserve the original behaviour (unlike BoxVolume, a clipped sphere
		// is not hidden).
	}

	raycast (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
		const is: THREE.Intersection[] = [];
		this.sphere.raycast(raycaster, is);

		if (is.length > 0) {
			const I = is[0];
			intersects.push({
				distance: I.distance,
				object: this,
				point: I.point.clone(),
			});
		}
	}

	getVolume () {
		return ellipsoidVolume(this.scale);
	}
}
