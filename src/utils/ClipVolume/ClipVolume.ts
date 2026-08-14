import * as THREE from "three";

import {
	boxFrameVertices,
	planeFrameVertices,
	localAxesFromQuaternion,
	rotationRadians,
	worldAxisToLocal,
	offsetVector,
} from "./clipVolumeMath";

interface ClipVolumeArgs {
	alpha?: number;
	beta?: number;
	gamma?: number;
}

interface AxisArgs {
	cs?: string | null;
	axis?: string | null;
	dir?: number | null;
}

export class ClipVolume extends THREE.Object3D {

	private static counter = -1;

	clipOffset: number;
	clipRotOffset: number;
	dimension: THREE.Vector3;
	material: THREE.MeshBasicMaterial;
	box: THREE.Mesh;
	boundingBox: THREE.Box3 | null;
	boundingSphere!: THREE.Sphere;
	frame: THREE.LineSegments;
	planeFrame: THREE.LineSegments;
	arrowX: THREE.Object3D;
	arrowY: THREE.Object3D;
	arrowZ: THREE.Object3D;
	localX!: THREE.Vector3;
	localY!: THREE.Vector3;
	localZ!: THREE.Vector3;

	constructor (args: ClipVolumeArgs) {
		super();

		this.name = "clip_volume_" + (++ClipVolume.counter);

		const alpha = args.alpha || 0;
		const beta = args.beta || 0;
		const gamma = args.gamma || 0;

		this.rotation.x = alpha;
		this.rotation.y = beta;
		this.rotation.z = gamma;

		this.clipOffset = 0.001;
		this.clipRotOffset = 1;

		const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
		boxGeometry.computeBoundingBox();

		const boxFrameGeometry = new THREE.BufferGeometry().setFromPoints(boxFrameVertices());
		const planeFrameGeometry = new THREE.BufferGeometry().setFromPoints(planeFrameVertices());

		this.dimension = new THREE.Vector3(1, 1, 1);
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
		this.planeFrame = new THREE.LineSegments(planeFrameGeometry, new THREE.LineBasicMaterial({ color: 0xff0000 }));
		this.add(this.planeFrame);

		// set default thickness
		this.setScaleZ(0.1);

		// create local coordinate system
		const createArrow = (name: string, color: number) => {
			const material = new THREE.MeshBasicMaterial({
				color: color,
				depthTest: false,
				depthWrite: false,
			});

			const shaftGeometry = new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(0, 0, 0),
				new THREE.Vector3(0, 1, 0),
			]);

			const shaftMaterial = new THREE.LineBasicMaterial({
				color: color,
				depthTest: false,
				depthWrite: false,
				transparent: true,
			});
			const shaft = new THREE.Line(shaftGeometry, shaftMaterial);
			shaft.name = name + "_shaft";

			const headGeometry = new THREE.CylinderGeometry(0, 0.04, 0.1, 10, 1, false);
			const headMaterial = material;
			const head = new THREE.Mesh(headGeometry, headMaterial);
			head.name = name + "_head";
			head.position.y = 1;

			const arrow = new THREE.Object3D();
			arrow.name = name;
			arrow.add(shaft);
			arrow.add(head);

			return arrow;
		};

		this.arrowX = createArrow("arrow_x", 0xFF0000);
		this.arrowY = createArrow("arrow_y", 0x00FF00);
		this.arrowZ = createArrow("arrow_z", 0x0000FF);

		this.arrowX.rotation.z = -Math.PI / 2;
		this.arrowZ.rotation.x = Math.PI / 2;

		this.arrowX.visible = false;
		this.arrowY.visible = false;
		this.arrowZ.visible = false;

		this.add(this.arrowX);
		this.add(this.arrowY);
		this.add(this.arrowZ);

		{ // event listeners (custom Potree events → cast off the typed event map)
			(this as any).addEventListener("ui_select", () => {
				this.arrowX.visible = true;
				this.arrowY.visible = true;
				this.arrowZ.visible = true;
			});
			(this as any).addEventListener("ui_deselect", () => {
				this.arrowX.visible = false;
				this.arrowY.visible = false;
				this.arrowZ.visible = false;
			});
			(this as any).addEventListener("select", () => {
				const scene_header = $("#" + this.name + " .scene_header");
				if (!scene_header.next().is(":visible")) {
					scene_header.click();
				}
			});
			(this as any).addEventListener("deselect", () => {
				const scene_header = $("#" + this.name + " .scene_header");
				if (scene_header.next().is(":visible")) {
					scene_header.click();
				}
			});
		}

		this.update();
	}

	setClipOffset (offset: number) {
		this.clipOffset = offset;
	}

	setClipRotOffset (offset: number) {
		this.clipRotOffset = offset;
	}

	setScaleX (x: number) {
		this.box.scale.x = x;
		this.frame.scale.x = x;
		this.planeFrame.scale.x = x;
	}

	setScaleY (y: number) {
		this.box.scale.y = y;
		this.frame.scale.y = y;
		this.planeFrame.scale.y = y;
	}

	setScaleZ (z: number) {
		this.box.scale.z = z;
		this.frame.scale.z = z;
		this.planeFrame.scale.z = z;
	}

	offset (args: AxisArgs) {
		const cs = args.cs || null;
		const axis = args.axis || null;
		const dir = args.dir || null;

		if (!cs || !axis || !dir) return;

		this.position.add(offsetVector(cs, axis, dir, this.clipOffset, {
			x: this.localX,
			y: this.localY,
			z: this.localZ,
		}));

		(this as any).dispatchEvent({ "type": "clip_volume_changed", "viewer": viewer, "volume": this });
	}

	rotate (args: AxisArgs) {
		const cs = args.cs || null;
		const axis = args.axis || null;
		const dir = args.dir || null;

		if (!cs || !axis || !dir) return;

		const angle = rotationRadians(dir, this.clipRotOffset);

		if (cs === "local") {
			if (axis === "x") {
				this.rotateOnAxis(new THREE.Vector3(1, 0, 0), angle);
			} else if (axis === "y") {
				this.rotateOnAxis(new THREE.Vector3(0, 1, 0), angle);
			} else if (axis === "z") {
				this.rotateOnAxis(new THREE.Vector3(0, 0, 1), angle);
			}
		} else if (cs === "global") {
			let worldAxis = new THREE.Vector3(1, 0, 0);
			if (axis === "y") {
				worldAxis = new THREE.Vector3(0, 1, 0);
			} else if (axis === "z") {
				worldAxis = new THREE.Vector3(0, 0, 1);
			}
			this.updateMatrixWorld();
			const rotaxis = worldAxisToLocal(worldAxis, this.matrixWorld);
			this.rotateOnAxis(rotaxis, angle);
		}

		this.updateLocalSystem();

		(this as any).dispatchEvent({ "type": "clip_volume_changed", "viewer": viewer, "volume": this });
	}

	update () {
		this.boundingBox = this.box.geometry.boundingBox;
		if (this.boundingBox) {
			this.boundingSphere = this.boundingBox.getBoundingSphere(new THREE.Sphere());
		}

		this.box.visible = false;

		this.updateLocalSystem();
	}

	updateLocalSystem () {
		// extract local coordinate axes
		const rotQuat = this.getWorldQuaternion(new THREE.Quaternion());
		const axes = localAxesFromQuaternion(rotQuat);
		this.localX = axes.x;
		this.localY = axes.y;
		this.localZ = axes.z;
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
}
