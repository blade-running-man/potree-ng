
import * as THREE from "three";

// Monkey-patch: cast the prototype to `any` for assignment; `this` keeps the
// real Ray type so the body type-checks.
(THREE.Ray.prototype as any).distanceToPlaneWithNegative = function (this: THREE.Ray, plane: THREE.Plane): number | null {
	let denominator = plane.normal.dot(this.direction);
	if (denominator === 0) {
		// line is coplanar, return origin
		if (plane.distanceToPoint(this.origin) === 0) {
			return 0;
		}

		// Null is preferable to undefined since undefined means.... it is undefined
		return null;
	}
	let t = -(this.origin.dot(plane.normal) + plane.constant) / denominator;

	return t;
};
