// Self-contained Morton/Z-order reordering for decoded point-cloud node data.
// No imports: bundled into the classic decode worker by build-esm-workers.mjs,
// and imported directly by Vitest unit tests.

// Interleave the low 10 bits of a coordinate into every 3rd bit (Z-order).
function part1By2(n) {
	n &= 0x3ff;
	n = (n | (n << 16)) & 0x030000ff;
	n = (n | (n << 8)) & 0x0300f00f;
	n = (n | (n << 4)) & 0x030c30c3;
	n = (n | (n << 2)) & 0x09249249;
	return n >>> 0;
}

/** 30-bit Morton code from integer cell coords in [0, 1024). */
export function mortonKey(ix, iy, iz) {
	return (part1By2(ix) | (part1By2(iy) << 1) | (part1By2(iz) << 2)) >>> 0;
}

/**
 * Compute the permutation that orders `numPoints` by the Morton code of their
 * quantized node-relative position. `positions` is a stride-3 Float32Array,
 * `size` is the node bounding-box size, `gridSize` the quantization resolution
 * (power of two). Clamped to 1024 because `part1By2` masks coordinates to 10
 * bits (cells 0..1023).
 * Returns a Uint32Array `perm` where perm[newIndex] = oldIndex.
 */
export function computeMortonPermutation(positions, numPoints, size, gridSize = 1024) {
	gridSize = Math.min(gridSize, 1024);
	const perm = new Uint32Array(numPoints);
	// A fresh Uint32Array is already zero-filled, so the 0/1-point cases need
	// no further work.
	if (numPoints <= 1) {
		return perm;
	}
	const keys = new Uint32Array(numPoints);
	const sx = size.x > 0 ? gridSize / size.x : 0;
	const sy = size.y > 0 ? gridSize / size.y : 0;
	const sz = size.z > 0 ? gridSize / size.z : 0;
	const maxCell = gridSize - 1;
	for (let j = 0; j < numPoints; j++) {
		let ix = (positions[3 * j + 0] * sx) | 0;
		let iy = (positions[3 * j + 1] * sy) | 0;
		let iz = (positions[3 * j + 2] * sz) | 0;
		if (ix < 0) ix = 0; else if (ix > maxCell) ix = maxCell;
		if (iy < 0) iy = 0; else if (iy > maxCell) iy = maxCell;
		if (iz < 0) iz = 0; else if (iz > maxCell) iz = maxCell;
		keys[j] = mortonKey(ix, iy, iz);
		perm[j] = j;
	}
	// Stable sort of the index array by Morton key (TypedArray.prototype.sort
	// is stable since ES2019), so points with equal keys keep their input order.
	perm.sort((a, b) => keys[a] - keys[b]);
	return perm;
}

/**
 * Apply `perm` to a typed array with `itemSize` elements per point.
 * Returns a new typed array of the same constructor, reordered so that
 * out[newIndex] = src[perm[newIndex]].
 */
export function applyPermutation(src, perm, itemSize) {
	const Ctor = src.constructor;
	const out = new Ctor(perm.length * itemSize);
	for (let i = 0; i < perm.length; i++) {
		const from = perm[i] * itemSize;
		const to = i * itemSize;
		for (let k = 0; k < itemSize; k++) out[to + k] = src[from + k];
	}
	return out;
}
