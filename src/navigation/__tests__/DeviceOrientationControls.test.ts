import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DeviceOrientationControls } from "../DeviceOrientationControls";

// Regression for the console warning "Use of the orientation sensor is
// deprecated." on every example. DeviceOrientationControls attached the
// `deviceorientation` listener in its constructor, so simply constructing it
// (the viewer does, eagerly) touched the deprecated sensor even on desktop
// where these controls are never activated. Listeners must be attached lazily,
// only while the controls are enabled.

describe("DeviceOrientationControls", () => {
	let added: string[];
	let removed: string[];

	beforeEach(() => {
		added = [];
		removed = [];
		(globalThis as unknown as { window: unknown }).window = {
			orientation: 0,
			ondeviceorientation: null, // makes `'ondeviceorientation' in window` true
			addEventListener: (type: string) => added.push(type),
			removeEventListener: (type: string) => removed.push(type),
		};
	});

	afterEach(() => {
		delete (globalThis as unknown as { window?: unknown }).window;
	});

	const make = () =>
		new DeviceOrientationControls({ renderer: {} } as unknown as never);

	it("does not touch the orientation sensor until enabled", () => {
		make();
		expect(added).toEqual([]);
	});

	it("attaches sensor listeners on enable and removes them on disable", () => {
		const controls = make();

		controls.enabled = true;
		expect(added).toContain("deviceorientation");
		expect(added).toContain("orientationchange");

		controls.enabled = false;
		expect(removed).toContain("deviceorientation");
		expect(removed).toContain("orientationchange");
	});
});
