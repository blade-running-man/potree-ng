// Mirrors the inline color normalization in EptLaszipDecoderWorker: 16-bit color
// (max channel > 255) is scaled down to 8-bit, otherwise passed through. Uint8
// assignment truncates, so Math.trunc models the effective stored value.
export function makeColorNormalizer(maxChannel: number): (c: number) => number {
	return maxChannel > 255 ? (c: number) => Math.trunc(c / 256) : (c: number) => c;
}
