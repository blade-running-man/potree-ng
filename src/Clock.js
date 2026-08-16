/**
 * Minimal frame clock backing `viewer.clock`.
 *
 * `getDelta()` returns the seconds elapsed since the previous `getDelta()` call
 * and advances on every call. `viewer.clock.getDelta()` is called directly and
 * per-frame by the render loop and by several examples that drive their own
 * loop, so this per-call-advancing contract is what it provides.
 */
export class Clock {
	/**
	 * @param {() => number} now - time source in milliseconds; defaults to
	 *   `performance.now`. Injectable so the delta logic is unit-testable.
	 */
	constructor(now = () => performance.now()) {
		this._now = now;
		this._previousTime = now();
	}

	/**
	 * @returns {number} seconds elapsed since the previous `getDelta()` call
	 *   (or since construction for the first call).
	 */
	getDelta() {
		const time = this._now();
		const delta = (time - this._previousTime) / 1000;
		this._previousTime = time;
		return delta;
	}
}
