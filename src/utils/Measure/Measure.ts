import * as THREE from "three";
import { TextSprite } from "../../TextSprite";
import { Utils } from "../../utils";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

import {
	polygonArea2D,
	totalDistance,
	angleBetween,
	polygonAngleAt,
	computeCircleCenter,
	centroid,
	heightExtent,
	convertLength,
	convertArea,
} from "./measureMath";

interface MeasurePoint {
	position: THREE.Vector3;
	[key: string]: any;
}

interface LengthUnit {
	unitspermeter: number;
	code: string;
}

function createHeightLine () {
	const lineGeometry = new LineGeometry();

	lineGeometry.setPositions([
		0, 0, 0,
		0, 0, 0,
	]);

	const lineMaterial = new LineMaterial({
		color: 0x00ff00,
		dashSize: 5,
		gapSize: 2,
		linewidth: 2,
		resolution: new THREE.Vector2(1000, 1000),
	});

	lineMaterial.depthTest = false;
	const heightEdge = new Line2(lineGeometry, lineMaterial);
	heightEdge.visible = false;

	return heightEdge;
}

function createHeightLabel () {
	const heightLabel = new TextSprite('');

	heightLabel.setTextColor({ r: 140, g: 250, b: 140, a: 1.0 });
	heightLabel.setBorderColor({ r: 0, g: 0, b: 0, a: 1.0 });
	heightLabel.setBackgroundColor({ r: 0, g: 0, b: 0, a: 1.0 });
	heightLabel.fontsize = 16;
	heightLabel.material.depthTest = false;
	heightLabel.material.opacity = 1;
	heightLabel.visible = false;

	return heightLabel;
}

function createAreaLabel () {
	const areaLabel = new TextSprite('');

	areaLabel.setTextColor({ r: 140, g: 250, b: 140, a: 1.0 });
	areaLabel.setBorderColor({ r: 0, g: 0, b: 0, a: 1.0 });
	areaLabel.setBackgroundColor({ r: 0, g: 0, b: 0, a: 1.0 });
	areaLabel.fontsize = 16;
	areaLabel.material.depthTest = false;
	areaLabel.material.opacity = 1;
	areaLabel.visible = false;

	return areaLabel;
}

function createCircleRadiusLabel () {
	const circleRadiusLabel = new TextSprite("");

	circleRadiusLabel.setTextColor({ r: 140, g: 250, b: 140, a: 1.0 });
	circleRadiusLabel.setBorderColor({ r: 0, g: 0, b: 0, a: 1.0 });
	circleRadiusLabel.setBackgroundColor({ r: 0, g: 0, b: 0, a: 1.0 });
	circleRadiusLabel.fontsize = 16;
	circleRadiusLabel.material.depthTest = false;
	circleRadiusLabel.material.opacity = 1;
	circleRadiusLabel.visible = false;

	return circleRadiusLabel;
}

function createCircleRadiusLine () {
	const lineGeometry = new LineGeometry();

	lineGeometry.setPositions([
		0, 0, 0,
		0, 0, 0,
	]);

	const lineMaterial = new LineMaterial({
		color: 0xff0000,
		linewidth: 2,
		resolution: new THREE.Vector2(1000, 1000),
		gapSize: 1,
		dashed: true,
	});

	lineMaterial.depthTest = false;

	const circleRadiusLine = new Line2(lineGeometry, lineMaterial);
	circleRadiusLine.visible = false;

	return circleRadiusLine;
}

function createCircleLine () {
	const coordinates: number[] = [];

	const n = 128;
	for (let i = 0; i <= n; i++) {
		const u0 = 2 * Math.PI * (i / n);
		const u1 = 2 * Math.PI * (i + 1) / n;

		const p0 = new THREE.Vector3(Math.cos(u0), Math.sin(u0), 0);
		const p1 = new THREE.Vector3(Math.cos(u1), Math.sin(u1), 0);

		coordinates.push(...p0.toArray(), ...p1.toArray());
	}

	const geometry = new LineGeometry();
	geometry.setPositions(coordinates);

	const material = new LineMaterial({
		color: 0xff0000,
		dashSize: 5,
		gapSize: 2,
		linewidth: 2,
		resolution: new THREE.Vector2(1000, 1000),
	});

	material.depthTest = false;

	const circleLine = new Line2(geometry, material);
	circleLine.visible = false;
	circleLine.computeLineDistances();

	return circleLine;
}

function createCircleCenter () {
	const sg = new THREE.SphereGeometry(1, 32, 32);
	const sm = new THREE.MeshNormalMaterial();

	const circleCenter = new THREE.Mesh(sg, sm);
	circleCenter.visible = false;

	return circleCenter;
}

function createLine () {
	const geometry = new LineGeometry();

	geometry.setPositions([
		0, 0, 0,
		0, 0, 0,
	]);

	const material = new LineMaterial({
		color: 0xff0000,
		linewidth: 2,
		resolution: new THREE.Vector2(1000, 1000),
		gapSize: 1,
		dashed: true,
	});

	material.depthTest = false;

	return new Line2(geometry, material);
}

function createCircle () {
	const coordinates: number[] = [];

	const n = 128;
	for (let i = 0; i <= n; i++) {
		const u0 = 2 * Math.PI * (i / n);
		const u1 = 2 * Math.PI * (i + 1) / n;

		const p0 = new THREE.Vector3(Math.cos(u0), Math.sin(u0), 0);
		const p1 = new THREE.Vector3(Math.cos(u1), Math.sin(u1), 0);

		coordinates.push(...p0.toArray(), ...p1.toArray());
	}

	const geometry = new LineGeometry();
	geometry.setPositions(coordinates);

	const material = new LineMaterial({
		color: 0xff0000,
		dashSize: 5,
		gapSize: 2,
		linewidth: 2,
		resolution: new THREE.Vector2(1000, 1000),
	});

	material.depthTest = false;

	const line = new Line2(geometry, material);
	line.computeLineDistances();

	return line;
}

function createAzimuth () {
	const azimuth: any = {
		label: null,
		center: null,
		target: null,
		north: null,
		centerToNorth: null,
		centerToTarget: null,
		centerToTargetground: null,
		targetgroundToTarget: null,
		circle: null,
		node: null,
	};

	const sg = new THREE.SphereGeometry(1, 32, 32);
	const sm = new THREE.MeshNormalMaterial();

	{
		const label = new TextSprite("");

		label.setTextColor({ r: 140, g: 250, b: 140, a: 1.0 });
		label.setBorderColor({ r: 0, g: 0, b: 0, a: 1.0 });
		label.setBackgroundColor({ r: 0, g: 0, b: 0, a: 1.0 });
		label.fontsize = 16;
		label.material.depthTest = false;
		label.material.opacity = 1;

		azimuth.label = label;
	}

	azimuth.center = new THREE.Mesh(sg, sm);
	azimuth.target = new THREE.Mesh(sg, sm);
	azimuth.north = new THREE.Mesh(sg, sm);
	azimuth.centerToNorth = createLine();
	azimuth.centerToTarget = createLine();
	azimuth.centerToTargetground = createLine();
	azimuth.targetgroundToTarget = createLine();
	azimuth.circle = createCircle();

	azimuth.node = new THREE.Object3D();
	azimuth.node.add(
		azimuth.centerToNorth,
		azimuth.centerToTarget,
		azimuth.centerToTargetground,
		azimuth.targetgroundToTarget,
		azimuth.circle,
		azimuth.label,
		azimuth.center,
		azimuth.target,
		azimuth.north,
	);

	return azimuth;
}

export class Measure extends THREE.Object3D {

	private static counter = -1;

	points: MeasurePoint[] = [];
	_showDistances = true;
	_showCoordinates = false;
	_showArea = false;
	_closed = true;
	_showAngles = false;
	_showCircle = false;
	_showHeight = false;
	_showEdges = true;
	_showAzimuth = false;
	maxMarkers = Number.MAX_SAFE_INTEGER;

	sphereGeometry: THREE.SphereGeometry;
	color: THREE.Color;

	spheres: THREE.Mesh[] = [];
	edges: any[] = [];
	edgeLabels: any[] = [];
	angleLabels: any[] = [];
	coordinateLabels: any[] = [];

	heightEdge: any;
	heightLabel: any;
	areaLabel: any;
	circleRadiusLabel: any;
	circleRadiusLine: any;
	circleLine: any;
	circleCenter: any;
	azimuth: any;

	lengthUnit?: LengthUnit;
	lengthUnitDisplay?: LengthUnit;

	constructor () {
		super();

		this.name = 'Measure_' + (++Measure.counter);

		this.sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
		this.color = new THREE.Color(0xff0000);

		this.heightEdge = createHeightLine();
		this.heightLabel = createHeightLabel();
		this.areaLabel = createAreaLabel();
		this.circleRadiusLabel = createCircleRadiusLabel();
		this.circleRadiusLine = createCircleRadiusLine();
		this.circleLine = createCircleLine();
		this.circleCenter = createCircleCenter();

		this.azimuth = createAzimuth();

		this.add(this.heightEdge);
		this.add(this.heightLabel);
		this.add(this.areaLabel);
		this.add(this.circleRadiusLabel);
		this.add(this.circleRadiusLine);
		this.add(this.circleLine);
		this.add(this.circleCenter);

		this.add(this.azimuth.node);
	}

	createSphereMaterial () {
		return new THREE.MeshLambertMaterial({
			color: this.color,
			depthTest: false,
			depthWrite: false,
		});
	}

	addMarker (point: any) {
		if (point.x != null) {
			point = { position: point };
		} else if (point instanceof Array) {
			point = { position: new THREE.Vector3(...point) };
		}
		this.points.push(point);

		// sphere
		const sphere = new THREE.Mesh(this.sphereGeometry, this.createSphereMaterial());

		this.add(sphere);
		this.spheres.push(sphere);

		{ // edges
			const lineGeometry = new LineGeometry();
			lineGeometry.setPositions([
				0, 0, 0,
				0, 0, 0,
			]);

			const lineMaterial = new LineMaterial({
				color: 0xff0000,
				linewidth: 2,
				resolution: new THREE.Vector2(1000, 1000),
			});

			lineMaterial.depthTest = false;

			const edge = new Line2(lineGeometry, lineMaterial);
			edge.visible = true;

			this.add(edge);
			this.edges.push(edge);
		}

		{ // edge labels
			const edgeLabel = new TextSprite();
			edgeLabel.setBorderColor({ r: 0, g: 0, b: 0, a: 1.0 });
			edgeLabel.setBackgroundColor({ r: 0, g: 0, b: 0, a: 1.0 });
			edgeLabel.material.depthTest = false;
			edgeLabel.visible = false;
			edgeLabel.fontsize = 16;
			this.edgeLabels.push(edgeLabel);
			this.add(edgeLabel);
		}

		{ // angle labels
			const angleLabel = new TextSprite();
			angleLabel.setBorderColor({ r: 0, g: 0, b: 0, a: 1.0 });
			angleLabel.setBackgroundColor({ r: 0, g: 0, b: 0, a: 1.0 });
			angleLabel.fontsize = 16;
			angleLabel.material.depthTest = false;
			angleLabel.material.opacity = 1;
			angleLabel.visible = false;
			this.angleLabels.push(angleLabel);
			this.add(angleLabel);
		}

		{ // coordinate labels
			const coordinateLabel = new TextSprite();
			coordinateLabel.setBorderColor({ r: 0, g: 0, b: 0, a: 1.0 });
			coordinateLabel.setBackgroundColor({ r: 0, g: 0, b: 0, a: 1.0 });
			coordinateLabel.fontsize = 16;
			coordinateLabel.material.depthTest = false;
			coordinateLabel.material.opacity = 1;
			coordinateLabel.visible = false;
			this.coordinateLabels.push(coordinateLabel);
			this.add(coordinateLabel);
		}

		{ // Event Listeners (Potree custom drag/drop events → dynamic payloads)
			const drag = (e: any) => {
				const I = Utils.getMousePointCloudIntersection(
					e.drag.end,
					e.viewer.scene.getActiveCamera(),
					e.viewer,
					e.viewer.scene.pointclouds,
					{ pickClipped: true });

				if (I) {
					const i = this.spheres.indexOf(e.drag.object);
					if (i !== -1) {
						const point = this.points[i];

						// loop through current keys and cleanup ones that will be orphaned
						for (const key of Object.keys(point)) {
							if (!I.point[key]) {
								delete point[key];
							}
						}

						for (const key of Object.keys(I.point).filter((e2) => e2 !== 'position')) {
							point[key] = I.point[key];
						}

						this.setPosition(i, I.location);
					}
				}
			};

			const drop = (e: any) => {
				const i = this.spheres.indexOf(e.drag.object);
				if (i !== -1) {
					(this as any).dispatchEvent({
						type: 'marker_dropped',
						measurement: this,
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
			measurement: this,
			sphere: sphere,
		});

		this.setMarker(this.points.length - 1, point);
	}

	removeMarker (index: number) {
		this.points.splice(index, 1);

		this.remove(this.spheres[index]);

		const edgeIndex = (index === 0) ? 0 : (index - 1);
		this.remove(this.edges[edgeIndex]);
		this.edges.splice(edgeIndex, 1);

		this.remove(this.edgeLabels[edgeIndex]);
		this.edgeLabels.splice(edgeIndex, 1);
		this.coordinateLabels.splice(index, 1);

		this.remove(this.angleLabels[index]);
		this.angleLabels.splice(index, 1);

		this.spheres.splice(index, 1);

		this.update();

		(this as any).dispatchEvent({ type: 'marker_removed', measurement: this });
	}

	setMarker (index: number, point: MeasurePoint) {
		this.points[index] = point;

		(this as any).dispatchEvent({
			type: 'marker_moved',
			measure: this,
			index: index,
			position: point.position.clone(),
		});

		this.update();
	}

	setPosition (index: number, position: THREE.Vector3) {
		const point = this.points[index];
		point.position.copy(position);

		(this as any).dispatchEvent({
			type: 'marker_moved',
			measure: this,
			index: index,
			position: position.clone(),
		});

		this.update();
	}

	getArea () {
		return polygonArea2D(this.points.map((p) => p.position));
	}

	getTotalDistance () {
		return totalDistance(this.points.map((p) => p.position), this.closed);
	}

	getAngleBetweenLines (cornerPoint: MeasurePoint, point1: MeasurePoint, point2: MeasurePoint) {
		return angleBetween(cornerPoint.position, point1.position, point2.position);
	}

	getAngle (index: number) {
		return polygonAngleAt(this.points.map((p) => p.position), index);
	}

	update () {
		if (this.points.length === 0) {
			return;
		} else if (this.points.length === 1) {
			const point = this.points[0];
			const position = point.position;
			this.spheres[0].position.copy(position);

			{ // coordinate labels
				const coordinateLabel = this.coordinateLabels[0];

				const msg = position.toArray().map((p) => Utils.addCommas(p.toFixed(2))).join(" / ");
				coordinateLabel.setText(msg);

				coordinateLabel.visible = this.showCoordinates;
			}

			return;
		}

		const lastIndex = this.points.length - 1;

		const centroidPos = centroid(this.points.map((p) => p.position));

		for (let i = 0; i <= lastIndex; i++) {
			const index = i;
			const nextIndex = (i + 1 > lastIndex) ? 0 : i + 1;
			const previousIndex = (i === 0) ? lastIndex : i - 1;

			const point = this.points[index];
			const nextPoint = this.points[nextIndex];
			const previousPoint = this.points[previousIndex];

			const sphere = this.spheres[index];

			// spheres
			sphere.position.copy(point.position);
			(sphere.material as THREE.MeshLambertMaterial).color = this.color;

			{ // edges
				const edge = this.edges[index];

				edge.material.color = this.color;

				edge.position.copy(point.position);

				edge.geometry.setPositions([
					0, 0, 0,
					...nextPoint.position.clone().sub(point.position).toArray(),
				]);

				edge.geometry.computeBoundingSphere();
				edge.computeLineDistances();
				edge.visible = index < lastIndex || this.closed;

				if (!this.showEdges) {
					edge.visible = false;
				}
			}

			{ // edge labels
				const edgeLabel = this.edgeLabels[i];

				let center = new THREE.Vector3().add(point.position);
				center.add(nextPoint.position);
				center = center.multiplyScalar(0.5);
				let distance = point.position.distanceTo(nextPoint.position);

				edgeLabel.position.copy(center);

				let suffix = "";
				if (this.lengthUnit != null && this.lengthUnitDisplay != null) {
					distance = convertLength(distance, this.lengthUnit.unitspermeter, this.lengthUnitDisplay.unitspermeter);
					suffix = this.lengthUnitDisplay.code;
				}

				const txtLength = Utils.addCommas(distance.toFixed(2));
				edgeLabel.setText(`${txtLength} ${suffix}`);
				edgeLabel.visible = this.showDistances && (index < lastIndex || this.closed) && this.points.length >= 2 && distance > 0;
			}

			{ // angle labels
				const angleLabel = this.angleLabels[i];
				const angle = this.getAngleBetweenLines(point, previousPoint, nextPoint);

				let dir = nextPoint.position.clone().sub(previousPoint.position);
				dir.multiplyScalar(0.5);
				dir = previousPoint.position.clone().add(dir).sub(point.position).normalize();

				let dist = Math.min(point.position.distanceTo(previousPoint.position), point.position.distanceTo(nextPoint.position));
				dist = dist / 9;

				const labelPos = point.position.clone().add(dir.multiplyScalar(dist));
				angleLabel.position.copy(labelPos);

				const msg = Utils.addCommas((angle * (180.0 / Math.PI)).toFixed(1)) + '°';
				angleLabel.setText(msg);

				angleLabel.visible = this.showAngles && (index < lastIndex || this.closed) && this.points.length >= 3 && angle > 0;
			}
		}

		{ // update height stuff
			const heightEdge = this.heightEdge;
			heightEdge.visible = this.showHeight;
			this.heightLabel.visible = this.showHeight;

			if (this.showHeight) {
				const sorted = this.points.slice().sort((a, b) => a.position.z - b.position.z);
				const lowPoint = sorted[0].position.clone();
				const highPoint = sorted[sorted.length - 1].position.clone();
				const { min, max, height: rawHeight } = heightExtent(this.points.map((p) => p.position));
				let height = rawHeight;

				const start = new THREE.Vector3(highPoint.x, highPoint.y, min);
				const end = new THREE.Vector3(highPoint.x, highPoint.y, max);

				heightEdge.position.copy(lowPoint);

				heightEdge.geometry.setPositions([
					0, 0, 0,
					...start.clone().sub(lowPoint).toArray(),
					...start.clone().sub(lowPoint).toArray(),
					...end.clone().sub(lowPoint).toArray(),
				]);

				heightEdge.geometry.computeBoundingSphere();
				heightEdge.computeLineDistances();

				const heightLabelPosition = start.clone().add(end).multiplyScalar(0.5);
				this.heightLabel.position.copy(heightLabelPosition);

				let suffix = "";
				if (this.lengthUnit != null && this.lengthUnitDisplay != null) {
					height = convertLength(height, this.lengthUnit.unitspermeter, this.lengthUnitDisplay.unitspermeter);
					suffix = this.lengthUnitDisplay.code;
				}

				const txtHeight = Utils.addCommas(height.toFixed(2));
				const msg = `${txtHeight} ${suffix}`;
				this.heightLabel.setText(msg);
			}
		}

		{ // update circle stuff
			const circleRadiusLabel = this.circleRadiusLabel;
			const circleRadiusLine = this.circleRadiusLine;
			const circleLine = this.circleLine;
			const circleCenter = this.circleCenter;

			const circleOkay = this.points.length === 3;

			circleRadiusLabel.visible = this.showCircle && circleOkay;
			circleRadiusLine.visible = this.showCircle && circleOkay;
			circleLine.visible = this.showCircle && circleOkay;
			circleCenter.visible = this.showCircle && circleOkay;

			if (this.showCircle && circleOkay) {

				const A = this.points[0].position;
				const B = this.points[1].position;
				const C = this.points[2].position;
				const AB = B.clone().sub(A);
				const AC = C.clone().sub(A);
				const N = AC.clone().cross(AB).normalize();

				const center = computeCircleCenter(A, B, C);
				const radius = center.distanceTo(A);

				const scale = radius / 20;
				circleCenter.position.copy(center);
				circleCenter.scale.set(scale, scale, scale);

				circleRadiusLine.geometry.setPositions([
					0, 0, 0,
					...B.clone().sub(center).toArray(),
				]);

				circleRadiusLine.geometry.computeBoundingSphere();
				circleRadiusLine.position.copy(center);
				circleRadiusLine.computeLineDistances();

				const target = center.clone().add(N);
				circleLine.position.copy(center);
				circleLine.scale.set(radius, radius, radius);
				circleLine.lookAt(target);

				circleRadiusLabel.visible = true;
				circleRadiusLabel.position.copy(center.clone().add(B).multiplyScalar(0.5));
				circleRadiusLabel.setText(`${radius.toFixed(3)}`);
			}
		}

		{ // update area label
			this.areaLabel.position.copy(centroidPos);
			this.areaLabel.visible = this.showArea && this.points.length >= 3;
			let area = this.getArea();

			let suffix = "";
			if (this.lengthUnit != null && this.lengthUnitDisplay != null) {
				area = convertArea(area, this.lengthUnit.unitspermeter, this.lengthUnitDisplay.unitspermeter);
				suffix = this.lengthUnitDisplay.code;
			}

			const txtArea = Utils.addCommas(area.toFixed(1));
			const msg = `${txtArea} ${suffix}²`;
			this.areaLabel.setText(msg);
		}
	}

	raycast (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
		for (let i = 0; i < this.points.length; i++) {
			const sphere = this.spheres[i];

			sphere.raycast(raycaster, intersects);
		}

		intersects.sort((a, b) => a.distance - b.distance);
	}

	get showCoordinates () {
		return this._showCoordinates;
	}

	set showCoordinates (value) {
		this._showCoordinates = value;
		this.update();
	}

	get showAngles () {
		return this._showAngles;
	}

	set showAngles (value) {
		this._showAngles = value;
		this.update();
	}

	get showCircle () {
		return this._showCircle;
	}

	set showCircle (value) {
		this._showCircle = value;
		this.update();
	}

	get showAzimuth () {
		return this._showAzimuth;
	}

	set showAzimuth (value) {
		this._showAzimuth = value;
		this.update();
	}

	get showEdges () {
		return this._showEdges;
	}

	set showEdges (value) {
		this._showEdges = value;
		this.update();
	}

	get showHeight () {
		return this._showHeight;
	}

	set showHeight (value) {
		this._showHeight = value;
		this.update();
	}

	get showArea () {
		return this._showArea;
	}

	set showArea (value) {
		this._showArea = value;
		this.update();
	}

	get closed () {
		return this._closed;
	}

	set closed (value) {
		this._closed = value;
		this.update();
	}

	get showDistances () {
		return this._showDistances;
	}

	set showDistances (value) {
		this._showDistances = value;
		this.update();
	}

}
