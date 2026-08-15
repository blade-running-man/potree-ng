import * as THREE from "three";

export class EptLaszipLoader {
	async load(node) {
		if (node.loaded) return;

		const { Key } = window.Copc

		const url = `${node.owner.base}/ept-data/${Key.toString(node.key)}.laz`
		const response = await fetch(url);
		const buffer = await response.arrayBuffer();
		this.parse(node, buffer);
	}

	async parse(node, compressed){
		let handler = new EptLazBatcher(node);

		try {
			const { Bounds, Las } = Copc

			const get = (begin, end) => new Uint8Array(compressed, begin, end - begin)

			const header = Las.Header.parse(new Uint8Array(compressed))
			const vlrs = await Las.Vlr.walk(get, header)
			let eb = []
			const ebVlr = Las.Vlr.find(vlrs, 'LASF_Spec', 4)
			if (ebVlr) eb = Las.ExtraBytes.parse(await Las.Vlr.fetch(get, ebVlr))

			const message = {
				isFullFile: true,
				compressed,
				header,
				eb,
				pointCount: header.pointCount,
				nodemin: Bounds.min(node.bounds),
			}
			handler.push(message)
		} catch (e) {
			console.log('Failed:', e)
		}
	}
};

export class CopcLaszipLoader {
	async load(node) {
		if (node.loaded) return;

		// There are utilities to do all of this in one async call via copc.js,
		// however we must split things out a bit to accommodate the expensive
		// calls to go in the worker.  So in this non-worker context, we just
		// isolate the compressed data buffer, which is passed to the worker.
		// The time-consuming decompression and extracting the data into 
		// GPU-compatible buffers happens in the worker.
		const { pointCount, pointDataOffset, pointDataLength } = node.nodeinfo

		// Note that COPC explicitly allows nodes to exist with no data.  They
		// may have children, but there is no point cloud data.  Make sure we
		// don't try to fetch a slice of point data in this case.
		if (!pointCount) return this.parse(node, new ArrayBuffer())
		const compressed = await node.owner.getter(
			pointDataOffset, 
			pointDataOffset + pointDataLength)
		this.parse(node, compressed.buffer);
	}

	async parse(node, compressed) {
		let handler = new EptLazBatcher(node);

		try {
			handler.push({
				isFullFile: false,
				compressed,
				header: node.owner.copc.header,
				eb: node.owner.copc.eb,
				pointCount: node.nodeinfo.pointCount,
				nodemin: node.bounds.slice(0, 3),
			})
		} catch (e) {
			console.log('Failed:', e)
		}
	}
};

export class EptLazBatcher {
	constructor(node) { this.node = node; }

	async push(las) {
		const { isFullFile, compressed, header, eb, pointCount, nodemin } = las;

		let workerPath = Potree.scriptPath + '/workers/EptLaszipDecoderWorker.js';
		const pointAttributes = this.node.owner.pointAttributes;
		let message = { isFullFile, compressed, header, eb, pointCount, nodemin };

		try {
			let data = await Potree.workerPool.runWorker(workerPath, message, [compressed]);

			let g = new THREE.BufferGeometry();

			let positions = new Float32Array(data.position);
			let colors = new Uint8Array(data.color);
			let intensities = new Float32Array(data.intensity);
			let classifications = new Uint8Array(data.classification);
			let returnNumbers = new Uint8Array(data.returnNumber);
			let numberOfReturns = new Uint8Array(data.numberOfReturns);
			let pointSourceIds = new Uint16Array(data.pointSourceId);
			let indices = new Uint8Array(data.indices);
			let gpsTime = new Float32Array(data.gpsTime);

			g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
			g.setAttribute('rgba', new THREE.BufferAttribute(colors, 4, true));
			g.setAttribute('intensity', new THREE.BufferAttribute(intensities, 1));
			g.setAttribute('classification', new THREE.BufferAttribute(classifications, 1));
			g.setAttribute('return number', new THREE.BufferAttribute(returnNumbers, 1));
			g.setAttribute('number of returns', new THREE.BufferAttribute(numberOfReturns, 1));
			g.setAttribute('source id', new THREE.BufferAttribute(pointSourceIds, 1));
			g.setAttribute('indices', new THREE.BufferAttribute(indices, 4));
			g.setAttribute('gps-time', new THREE.BufferAttribute(gpsTime, 1));
			this.node.gpsTime = data.gpsMeta;

			g.attributes.indices.normalized = true;

			for (const key in data.ranges) {
				const range = data.ranges[key];
				const attribute = pointAttributes.attributes.find(a => a.name === key);
				if (attribute) {
					attribute.range[0] = Math.min(attribute.range[0], range[0]);
					attribute.range[1] = Math.max(attribute.range[1], range[1]);
					if (!attribute.initialRange) {
						attribute.initialRange = attribute.range;
					}
				}
			}

			let tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(data.tightBoundingBox.max)
			);

			this.node.doneLoading(g, tightBoundingBox, pointCount, new THREE.Vector3(...data.mean));
		} catch (err) {
			console.error(`EptLaszipDecoderWorker failed for node ${this.node.name}:`, err);
			this.node.loading = false;
		} finally {
			Potree.numNodesLoading--;
		}
	};
};
