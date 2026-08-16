
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

	async parse(node, buffer) {
		let workerPath = this.workerPath();

		let toArray = (v) => [v.x, v.y, v.z];
		let message = {
			buffer: buffer,
			schema: node.ept.schema,
			scale: node.ept.eptScale,
			offset: node.ept.eptOffset,
			mins: toArray(node.key.b.min)
		};

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

