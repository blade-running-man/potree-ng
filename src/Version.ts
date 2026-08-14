
export class Version {

	version: string;
	versionMajor: number;
	versionMinor: number;

	constructor(version: string) {
		this.version = version;
		let vmLength = (version.indexOf('.') === -1) ? version.length : version.indexOf('.');
		this.versionMajor = parseInt(version.substr(0, vmLength));
		this.versionMinor = parseInt(version.substr(vmLength + 1));
		// NOTE: `.length` on a number is always undefined at runtime, so this
		// branch never fires. Behavior preserved verbatim from the original JS.
		if ((this.versionMinor as any).length === 0) {
			this.versionMinor = 0;
		}
	}

	newerThan(version: string): boolean {
		let v = new Version(version);

		if (this.versionMajor > v.versionMajor) {
			return true;
		} else if (this.versionMajor === v.versionMajor && this.versionMinor > v.versionMinor) {
			return true;
		} else {
			return false;
		}
	}

	equalOrHigher(version: string): boolean {
		let v = new Version(version);

		if (this.versionMajor > v.versionMajor) {
			return true;
		} else if (this.versionMajor === v.versionMajor && this.versionMinor >= v.versionMinor) {
			return true;
		} else {
			return false;
		}
	}

	upTo(version: string): boolean {
		return !this.newerThan(version);
	}

}
