

export class InterleavedBufferAttribute {

	name: string;
	bytes: number;
	numElements: number;
	normalized: boolean;
	type: string;

	constructor(name: string, bytes: number, numElements: number, type: string, normalized: boolean) {
		this.name = name;
		this.bytes = bytes;
		this.numElements = numElements;
		this.normalized = normalized;
		this.type = type; // gl type without prefix, e.g. "FLOAT", "UNSIGNED_INT"
	}

}

export class InterleavedBuffer {

	data: any;
	attributes: InterleavedBufferAttribute[];
	stride: number;
	numElements: number;

	constructor(data: any, attributes: InterleavedBufferAttribute[], numElements: number) {
		this.data = data;
		this.attributes = attributes;
		this.stride = attributes.reduce((a, att) => a + att.bytes, 0);
		this.stride = Math.ceil(this.stride / 4) * 4;
		this.numElements = numElements;
	}

	offset(name: string): number | null {
		let offset = 0;

		for (let att of this.attributes) {
			if (att.name === name) {
				return offset;
			}

			offset += att.bytes;
		}

		return null;
	}

}
