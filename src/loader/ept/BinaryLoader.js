
import * as THREE from "three";
import {XHRFactory} from "../../XHRFactory";

export class EptBinaryLoader {
	extension() {
		return '.bin';
	}

	workerPath() {
		return Potree.scriptPath + '/workers/EptBinaryDecoderWorker.js';
	}

	// PointCloudCopcGeometryNode has no url() method; derive the data URL the
	// same way EptLaszipLoader does. extension() is polymorphic (.bin / .zst).
	nodeUrl(node) {
		const { Key } = window.Copc;
		return `${node.owner.base}/ept-data/${Key.toString(node.key)}${this.extension()}`;
	}

	load(node) {
		if (node.loaded) return;

		let url = this.nodeUrl(node);

		let xhr = XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.onreadystatechange = () => {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					let buffer = xhr.response;
					this.parse(node, buffer);
				} else {
					console.log('Failed ' + url + ': ' + xhr.status);
				}
			}
		};

		try {
			xhr.send(null);
		}
		catch (e) {
			console.log('Failed request: ' + e);
		}
	}

	// parseEpt (the worker) applies `raw * scale.{x,y,z} + offset.{x,y,z} - mins`.
	// The EPT metadata lives on the geometry (node.owner.ept); XYZ scale/offset are
	// per-dimension in the schema (older EPT files put them at the top level), and
	// mins is the node's bounds minimum (matching EptLaszipLoader).
	workerMessage(node, buffer) {
		const { Bounds } = window.Copc;
		const ept = node.owner.ept;
		const schema = ept.schema;

		const dim = (name) => schema.find((d) => d.name === name) || {};
		const pick = (d, key, fallback) => (d[key] !== undefined ? d[key] : fallback);
		const gScale = Array.isArray(ept.scale) ? ept.scale : [1, 1, 1];
		const gOffset = Array.isArray(ept.offset) ? ept.offset : [0, 0, 0];
		const [dx, dy, dz] = ['X', 'Y', 'Z'].map(dim);

		return {
			buffer: buffer,
			schema: schema,
			scale: {
				x: pick(dx, 'scale', gScale[0]),
				y: pick(dy, 'scale', gScale[1]),
				z: pick(dz, 'scale', gScale[2]),
			},
			offset: {
				x: pick(dx, 'offset', gOffset[0]),
				y: pick(dy, 'offset', gOffset[1]),
				z: pick(dz, 'offset', gOffset[2]),
			},
			mins: Bounds.min(node.bounds),
		};
	}

	async parse(node, buffer) {
		let workerPath = this.workerPath();
		let message = this.workerMessage(node, buffer);

		try {
			let data = await Potree.workerPool.runWorker(workerPath, message, [message.buffer]);

			let g = new THREE.BufferGeometry();
			let numPoints = data.numPoints;

			let position = new Float32Array(data.position);
			g.setAttribute('position', new THREE.BufferAttribute(position, 3));

			let indices = new Uint8Array(data.indices);
			g.setAttribute('indices', new THREE.BufferAttribute(indices, 4));

			if (data.color) {
				let color = new Uint8Array(data.color);
				g.setAttribute('color', new THREE.BufferAttribute(color, 4, true));
			}
			if (data.intensity) {
				let intensity = new Float32Array(data.intensity);
				g.setAttribute('intensity', new THREE.BufferAttribute(intensity, 1));
			}
			if (data.classification) {
				let classification = new Uint8Array(data.classification);
				g.setAttribute('classification', new THREE.BufferAttribute(classification, 1));
			}
			if (data.returnNumber) {
				let returnNumber = new Uint8Array(data.returnNumber);
				g.setAttribute('return number', new THREE.BufferAttribute(returnNumber, 1));
			}
			if (data.numberOfReturns) {
				let numberOfReturns = new Uint8Array(data.numberOfReturns);
				g.setAttribute('number of returns', new THREE.BufferAttribute(numberOfReturns, 1));
			}
			if (data.pointSourceId) {
				let pointSourceId = new Uint16Array(data.pointSourceId);
				g.setAttribute('source id', new THREE.BufferAttribute(pointSourceId, 1));
			}

			g.attributes.indices.normalized = true;

			let tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(data.tightBoundingBox.max)
			);

			node.doneLoading(g, tightBoundingBox, numPoints, new THREE.Vector3(...data.mean));
		} catch (err) {
			console.error(`EptBinaryDecoderWorker failed for node ${node.name}:`, err);
			node.loading = false;
			Potree.numNodesLoading--;
		}
	}
};

