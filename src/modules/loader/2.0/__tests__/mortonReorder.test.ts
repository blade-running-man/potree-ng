import { describe, it, expect } from 'vitest';
import { mortonKey, computeMortonPermutation, applyPermutation } from '../mortonReorder';

describe('mortonKey', () => {
  it('interleaves bits of small coordinates (Z-order)', () => {
    // (x=1,y=0,z=0) -> bit0 set => 1 ; (x=0,y=1,z=0) -> bit1 => 2 ; (x=0,y=0,z=1) -> bit2 => 4
    expect(mortonKey(1, 0, 0)).toBe(1);
    expect(mortonKey(0, 1, 0)).toBe(2);
    expect(mortonKey(0, 0, 1)).toBe(4);
    expect(mortonKey(1, 1, 1)).toBe(7);
  });
  it('is monotonic within a single axis', () => {
    expect(mortonKey(2, 0, 0)).toBeGreaterThan(mortonKey(1, 0, 0));
  });
});

describe('computeMortonPermutation', () => {
  it('orders points by Morton code of their quantized position', () => {
    // three points; positions node-relative within size [0..4)
    const positions = new Float32Array([
      3, 3, 3, // point 0 -> high code
      0, 0, 0, // point 1 -> code 0
      1, 0, 0, // point 2 -> code 1
    ]);
    const size = { x: 4, y: 4, z: 4 };
    const perm = computeMortonPermutation(positions, 3, size, 4);
    // sorted ascending by code => [point1(0), point2(1), point0(high)]
    expect(Array.from(perm)).toEqual([1, 2, 0]);
  });
  it('handles 0 and 1 point without throwing', () => {
    expect(Array.from(computeMortonPermutation(new Float32Array([]), 0, { x: 1, y: 1, z: 1 }, 4))).toEqual([]);
    expect(Array.from(computeMortonPermutation(new Float32Array([0, 0, 0]), 1, { x: 1, y: 1, z: 1 }, 4))).toEqual([0]);
  });
  it('clamps out-of-range coordinates: negative goes to cell 0, at-boundary goes to the max cell', () => {
    const positions = new Float32Array([
      -5, 0, 0, // point 0: negative coord clamps to cell 0 -> key 0
      4, 4, 4, // point 1: exactly at `size` clamps to maxCell (gridSize-1) -> highest key
      0, 0, 0, // point 2: also cell 0 -> ties with point 0
    ]);
    const size = { x: 4, y: 4, z: 4 };
    const perm = computeMortonPermutation(positions, 3, size, 4);
    // point 1 sorts last (highest key); tied points 0 and 2 keep their relative order (stable sort).
    expect(Array.from(perm)).toEqual([0, 2, 1]);
  });
});

describe('applyPermutation', () => {
  it('reorders a stride-3 Float32Array', () => {
    const src = new Float32Array([10, 11, 12, 20, 21, 22, 30, 31, 32]);
    const out = applyPermutation(src, Uint32Array.from([2, 0, 1]), 3);
    expect(Array.from(out)).toEqual([30, 31, 32, 10, 11, 12, 20, 21, 22]);
  });
  it('reorders a stride-4 Uint8Array (rgba)', () => {
    const src = new Uint8Array([1, 1, 1, 1, 2, 2, 2, 2]);
    const out = applyPermutation(src, Uint32Array.from([1, 0]), 4);
    expect(Array.from(out)).toEqual([2, 2, 2, 2, 1, 1, 1, 1]);
  });
  it('reorders a stride-1 typed array preserving element type', () => {
    const src = Int32Array.from([100, 200, 300]);
    const out = applyPermutation(src, Uint32Array.from([2, 1, 0]), 1);
    expect(out).toBeInstanceOf(Int32Array);
    expect(Array.from(out)).toEqual([300, 200, 100]);
  });
});
