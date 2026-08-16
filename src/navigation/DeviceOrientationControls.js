/**
 * @author chrisl / Geodan
 *
 * adapted from Potree.FirstPersonControls by
 *
 * @author mschuetz / http://mschuetz.at
 *
 * and THREE.DeviceOrientationControls  by
 *
 * @author richt / http://richt.me
 * @author WestLangley / http://github.com/WestLangley
 *
 *
 *
 */

import * as THREE from "three";
import {EventDispatcher} from "../EventDispatcher";

export class DeviceOrientationControls extends EventDispatcher{
	constructor(viewer){
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.scene = null;
		this.sceneControls = new THREE.Scene();

		this.screenOrientation = window.orientation || 0;

		this._enabled = false;

		this._deviceOrientationChange = e => {
			this.deviceOrientation = e;
		};

		this._screenOrientationChange = () => {
			this.screenOrientation = window.orientation || 0;
		};

		// Listeners are attached lazily in connect() via the `enabled` setter.
		// Touching the (deprecated) orientation sensor in the constructor would
		// warn on every load, even on desktop where these controls are never
		// activated.
	}

	get enabled () {
		return this._enabled;
	}

	set enabled (value) {
		if (value === this._enabled) return;
		this._enabled = value;
		if (value) {
			this.connect();
		} else {
			this.disconnect();
		}
	}

	connect () {
		if ('ondeviceorientationabsolute' in window) {
			window.addEventListener('deviceorientationabsolute', this._deviceOrientationChange);
		} else if ('ondeviceorientation' in window) {
			window.addEventListener('deviceorientation', this._deviceOrientationChange);
		} else {
			console.warn("No device orientation found.");
		}
		window.addEventListener('orientationchange', this._screenOrientationChange);
	}

	disconnect () {
		window.removeEventListener('deviceorientationabsolute', this._deviceOrientationChange);
		window.removeEventListener('deviceorientation', this._deviceOrientationChange);
		window.removeEventListener('orientationchange', this._screenOrientationChange);
	}

	setScene (scene) {
		this.scene = scene;
	}

	update (delta) {
		let computeQuaternion = function (alpha, beta, gamma, orient) {
			let quaternion = new THREE.Quaternion();

			let zee = new THREE.Vector3(0, 0, 1);
			let euler = new THREE.Euler();
			let q0 = new THREE.Quaternion();

			euler.set(beta, gamma, alpha, 'ZXY');
			quaternion.setFromEuler(euler);
			quaternion.multiply(q0.setFromAxisAngle(zee, -orient));

			return quaternion;
		};

		if (typeof this.deviceOrientation !== 'undefined') {
			let alpha = this.deviceOrientation.alpha ? THREE.MathUtils.degToRad(this.deviceOrientation.alpha) : 0;
			let beta = this.deviceOrientation.beta ? THREE.MathUtils.degToRad(this.deviceOrientation.beta) : 0;
			let gamma = this.deviceOrientation.gamma ? THREE.MathUtils.degToRad(this.deviceOrientation.gamma) : 0;
			let orient = this.screenOrientation ? THREE.MathUtils.degToRad(this.screenOrientation) : 0;

			let quaternion = computeQuaternion(alpha, beta, gamma, orient);
			viewer.scene.cameraP.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
		}
	}
};
