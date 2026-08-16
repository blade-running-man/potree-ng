import * as THREE from "three";
import { Measure } from "../Measure";
import { Utils } from "../../utils";
import { CameraMode } from "../../defines";
import { EventDispatcher } from "../../EventDispatcher";

import { normalizeAzimuthDegrees, labelScale } from "./measuringToolMath";

function updateAzimuth (viewer: any, measure: any) {

	const azimuth = measure.azimuth;

	const isOkay = measure.points.length === 2;

	azimuth.node.visible = isOkay && measure.showAzimuth;

	if (!azimuth.node.visible) {
		return;
	}

	const camera = viewer.scene.getActiveCamera();
	const renderAreaSize = viewer.renderer.getSize(new THREE.Vector2());
	const width = renderAreaSize.width;
	const height = renderAreaSize.height;

	const [p0, p1] = measure.points;
	const r = p0.position.distanceTo(p1.position);
	const northVec = Utils.getNorthVec(p0.position, r, viewer.getProjection());
	const northPos = p0.position.clone().add(northVec);

	azimuth.center.position.copy(p0.position);
	azimuth.center.scale.set(2, 2, 2);

	azimuth.center.visible = false;

	{ // north
		azimuth.north.position.copy(northPos);
		azimuth.north.scale.set(2, 2, 2);

		const distance = azimuth.north.position.distanceTo(camera.position);
		const pr = Utils.projectedRadius(1, camera, distance, width, height);

		const scale = labelScale(pr, 5);
		azimuth.north.scale.set(scale, scale, scale);
	}

	{ // target
		azimuth.target.position.copy(p1.position);
		azimuth.target.position.z = azimuth.north.position.z;

		const distance = azimuth.target.position.distanceTo(camera.position);
		const pr = Utils.projectedRadius(1, camera, distance, width, height);

		const scale = labelScale(pr, 5);
		azimuth.target.scale.set(scale, scale, scale);
	}

	azimuth.circle.position.copy(p0.position);
	azimuth.circle.scale.set(r, r, r);
	azimuth.circle.material.resolution.set(width, height);

	// to target
	azimuth.centerToTarget.geometry.setPositions([
		0, 0, 0,
		...p1.position.clone().sub(p0.position).toArray(),
	]);
	azimuth.centerToTarget.position.copy(p0.position);
	azimuth.centerToTarget.geometry.computeBoundingSphere();
	azimuth.centerToTarget.computeLineDistances();
	azimuth.centerToTarget.material.resolution.set(width, height);

	// to target ground
	azimuth.centerToTargetground.geometry.setPositions([
		0, 0, 0,
		p1.position.x - p0.position.x,
		p1.position.y - p0.position.y,
		0,
	]);
	azimuth.centerToTargetground.position.copy(p0.position);
	azimuth.centerToTargetground.geometry.computeBoundingSphere();
	azimuth.centerToTargetground.computeLineDistances();
	azimuth.centerToTargetground.material.resolution.set(width, height);

	// to north
	azimuth.centerToNorth.geometry.setPositions([
		0, 0, 0,
		northPos.x - p0.position.x,
		northPos.y - p0.position.y,
		0,
	]);
	azimuth.centerToNorth.position.copy(p0.position);
	azimuth.centerToNorth.geometry.computeBoundingSphere();
	azimuth.centerToNorth.computeLineDistances();
	azimuth.centerToNorth.material.resolution.set(width, height);

	// label
	const radians = Utils.computeAzimuth(p0.position, p1.position, viewer.getProjection());
	const degrees = normalizeAzimuthDegrees(radians);
	const txtDegrees = `${degrees.toFixed(2)}°`;
	const labelDir = northPos.clone().add(p1.position).multiplyScalar(0.5).sub(p0.position);
	if (labelDir.length() > 0) {
		labelDir.z = 0;
		labelDir.normalize();
		const labelVec = labelDir.clone().multiplyScalar(r);
		const labelPos = p0.position.clone().add(labelVec);
		azimuth.label.position.copy(labelPos);
	}
	azimuth.label.setText(txtDegrees);
	const distance = azimuth.label.position.distanceTo(camera.position);
	const pr = Utils.projectedRadius(1, camera, distance, width, height);
	const scale = labelScale(pr, 70);
	azimuth.label.scale.set(scale, scale, scale);
}

export class MeasuringTool extends EventDispatcher {

	viewer: any;
	renderer: any;
	showLabels: boolean;
	scene: THREE.Scene;
	light: THREE.PointLight;
	onRemove: (e: any) => void;
	onAdd: (e: any) => void;

	constructor (viewer: any) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.addEventListener('start_inserting_measurement', () => {
			this.viewer.dispatchEvent({
				type: 'cancel_insertions',
			});
		});

		this.showLabels = true;
		this.scene = new THREE.Scene();
		this.scene.name = 'scene_measurement';
		this.light = new THREE.PointLight(0xffffff, 1.0);
		this.scene.add(this.light);

		this.viewer.inputHandler.registerInteractiveScene(this.scene);

		this.onRemove = (e: any) => { this.scene.remove(e.measurement); };
		this.onAdd = (e: any) => { this.scene.add(e.measurement); };

		for (const measurement of viewer.scene.measurements) {
			this.onAdd({ measurement: measurement });
		}

		viewer.addEventListener("update", this.update.bind(this));
		viewer.addEventListener("render.pass.perspective_overlay", this.render.bind(this));
		viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));

		viewer.scene.addEventListener('measurement_added', this.onAdd);
		viewer.scene.addEventListener('measurement_removed', this.onRemove);
	}

	onSceneChange (e: any) {
		if (e.oldScene) {
			e.oldScene.removeEventListener('measurement_added', this.onAdd);
			e.oldScene.removeEventListener('measurement_removed', this.onRemove);
		}

		e.scene.addEventListener('measurement_added', this.onAdd);
		e.scene.addEventListener('measurement_removed', this.onRemove);
	}

	startInsertion (args: any = {}) {
		const domElement = this.viewer.renderer.domElement;

		const measure = new Measure();

		this.dispatchEvent({
			type: 'start_inserting_measurement',
			measure: measure,
		});

		const pick = (defaul: any, alternative: any) => {
			if (defaul != null) {
				return defaul;
			} else {
				return alternative;
			}
		};

		measure.showDistances = pick(args.showDistances, true);

		measure.showArea = pick(args.showArea, false);
		measure.showAngles = pick(args.showAngles, false);
		measure.showCoordinates = pick(args.showCoordinates, false);
		measure.showHeight = pick(args.showHeight, false);
		measure.showCircle = pick(args.showCircle, false);
		measure.showAzimuth = pick(args.showAzimuth, false);
		measure.showEdges = pick(args.showEdges, true);
		measure.closed = pick(args.closed, false);
		measure.maxMarkers = pick(args.maxMarkers, Infinity);

		measure.name = args.name || 'Measurement';

		this.scene.add(measure);

		const cancel: { removeLastMarker: boolean; callback: (e?: any) => void } = {
			removeLastMarker: measure.maxMarkers > 3,
			callback: () => {},
		};

		const insertionCallback = (e: any) => {
			if (e.button === THREE.MOUSE.LEFT) {
				measure.addMarker(measure.points[measure.points.length - 1].position.clone());

				if (measure.points.length >= measure.maxMarkers) {
					cancel.callback();
				}

				this.viewer.inputHandler.startDragging(
					measure.spheres[measure.spheres.length - 1]);
			} else if (e.button === THREE.MOUSE.RIGHT) {
				cancel.callback();
			}
		};

		cancel.callback = () => {
			if (cancel.removeLastMarker) {
				measure.removeMarker(measure.points.length - 1);
			}
			domElement.removeEventListener('mouseup', insertionCallback, false);
			this.viewer.removeEventListener('cancel_insertions', cancel.callback);
		};

		if (measure.maxMarkers > 1) {
			this.viewer.addEventListener('cancel_insertions', cancel.callback);
			domElement.addEventListener('mouseup', insertionCallback, false);
		}

		measure.addMarker(new THREE.Vector3(0, 0, 0));
		this.viewer.inputHandler.startDragging(
			measure.spheres[measure.spheres.length - 1]);

		this.viewer.scene.addMeasurement(measure);

		return measure;
	}

	update () {
		const camera = this.viewer.scene.getActiveCamera();
		const measurements = this.viewer.scene.measurements;

		const renderAreaSize = this.renderer.getSize(new THREE.Vector2());
		const clientWidth = renderAreaSize.width;
		const clientHeight = renderAreaSize.height;

		this.light.position.copy(camera.position);

		// make size independent of distance
		for (const measure of measurements) {
			measure.lengthUnit = this.viewer.lengthUnit;
			measure.lengthUnitDisplay = this.viewer.lengthUnitDisplay;
			measure.update();

			updateAzimuth(this.viewer, measure);

			// spheres
			for (const sphere of measure.spheres) {
				const distance = camera.position.distanceTo(sphere.getWorldPosition(new THREE.Vector3()));
				const pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
				const scale = labelScale(pr, 15);
				sphere.scale.set(scale, scale, scale);
			}

			// labels
			const labels = measure.edgeLabels.concat(measure.angleLabels);
			for (const label of labels) {
				const distance = camera.position.distanceTo(label.getWorldPosition(new THREE.Vector3()));
				const pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
				let scale = labelScale(pr, 70);

				if (Potree.debug.scale) {
					scale = labelScale(pr, Potree.debug.scale);
				}

				label.scale.set(scale, scale, scale);
			}

			// coordinate labels
			for (let j = 0; j < measure.coordinateLabels.length; j++) {
				const label = measure.coordinateLabels[j];
				const sphere = measure.spheres[j];

				const distance = camera.position.distanceTo(sphere.getWorldPosition(new THREE.Vector3()));

				const screenPos = sphere.getWorldPosition(new THREE.Vector3()).clone().project(camera);
				screenPos.x = Math.round((screenPos.x + 1) * clientWidth / 2);
				screenPos.y = Math.round((-screenPos.y + 1) * clientHeight / 2);
				screenPos.z = 0;
				screenPos.y -= 30;

				let labelPos = new THREE.Vector3(
					(screenPos.x / clientWidth) * 2 - 1,
					-(screenPos.y / clientHeight) * 2 + 1,
					0.5);
				labelPos.unproject(camera);
				if (this.viewer.scene.cameraMode == CameraMode.PERSPECTIVE) {
					const direction = labelPos.sub(camera.position).normalize();
					labelPos = new THREE.Vector3().addVectors(
						camera.position, direction.multiplyScalar(distance));
				}
				label.position.copy(labelPos);
				const pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
				const scale = labelScale(pr, 70);
				label.scale.set(scale, scale, scale);
			}

			// height label
			if (measure.showHeight) {
				const label = measure.heightLabel;

				{
					const distance = label.position.distanceTo(camera.position);
					const pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
					const scale = labelScale(pr, 70);
					label.scale.set(scale, scale, scale);
				}

				{ // height edge
					const edge = measure.heightEdge;

					// The fat-line (Line2) computes its own dash spacing via
					// computeLineDistances(); only the dash appearance is set here.
					edge.material.dashSize = 10;
					edge.material.gapSize = 10;
				}
			}

			{ // area label
				const label = measure.areaLabel;
				const distance = label.position.distanceTo(camera.position);
				const pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);

				const scale = labelScale(pr, 70);
				label.scale.set(scale, scale, scale);
			}

			{ // radius label
				const label = measure.circleRadiusLabel;
				const distance = label.position.distanceTo(camera.position);
				const pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);

				const scale = labelScale(pr, 70);
				label.scale.set(scale, scale, scale);
			}

			{ // edges
				const materials = [
					measure.circleRadiusLine.material,
					...measure.edges.map((e: any) => e.material),
					measure.heightEdge.material,
					measure.circleLine.material,
				];

				for (const material of materials) {
					material.resolution.set(clientWidth, clientHeight);
				}
			}

			if (!this.showLabels) {

				const labels = [
					...measure.edgeLabels,
					...measure.angleLabels,
					...measure.coordinateLabels,
					measure.heightLabel,
					measure.areaLabel,
					measure.circleRadiusLabel,
				];

				for (const label of labels) {
					label.visible = false;
				}
			}
		}
	}

	render () {
		this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
	}

}
