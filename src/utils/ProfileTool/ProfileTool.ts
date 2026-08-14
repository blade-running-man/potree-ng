import * as THREE from "three";
import { Profile } from "../Profile";
import { Utils } from "../../utils";
import { EventDispatcher } from "../../EventDispatcher";

import { screenConstantScale } from "./profileToolMath";

export class ProfileTool extends EventDispatcher {

	viewer: any;
	renderer: any;
	scene: THREE.Scene;
	light: THREE.PointLight;
	onRemove: (e: any) => void;
	onAdd: (e: any) => void;

	constructor (viewer: any) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.addEventListener('start_inserting_profile', () => {
			this.viewer.dispatchEvent({
				type: 'cancel_insertions',
			});
		});

		this.scene = new THREE.Scene();
		this.scene.name = 'scene_profile';
		this.light = new THREE.PointLight(0xffffff, 1.0);
		this.scene.add(this.light);

		this.viewer.inputHandler.registerInteractiveScene(this.scene);

		this.onRemove = (e: any) => this.scene.remove(e.profile);
		this.onAdd = (e: any) => this.scene.add(e.profile);

		for (const profile of viewer.scene.profiles) {
			this.onAdd({ profile: profile });
		}

		viewer.addEventListener("update", this.update.bind(this));
		viewer.addEventListener("render.pass.perspective_overlay", this.render.bind(this));
		viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));

		viewer.scene.addEventListener('profile_added', this.onAdd);
		viewer.scene.addEventListener('profile_removed', this.onRemove);
	}

	onSceneChange (e: any) {
		if (e.oldScene) {
			e.oldScene.removeEventListener('profile_added', this.onAdd);
			e.oldScene.removeEventListener('profile_removed', this.onRemove);
		}

		e.scene.addEventListener('profile_added', this.onAdd);
		e.scene.addEventListener('profile_removed', this.onRemove);
	}

	startInsertion (args: any = {}) {
		const domElement = this.viewer.renderer.domElement;

		const profile = new Profile();
		profile.name = args.name || 'Profile';

		this.dispatchEvent({
			type: 'start_inserting_profile',
			profile: profile,
		});

		this.scene.add(profile);

		const cancel: { callback: (e?: any) => void } = { callback: () => {} };

		const insertionCallback = (e: any) => {
			if (e.button === THREE.MOUSE.LEFT) {
				if (profile.points.length <= 1) {
					const camera = this.viewer.scene.getActiveCamera();
					const distance = camera.position.distanceTo(profile.points[0]);
					const clientSize = this.viewer.renderer.getSize(new THREE.Vector2());
					const pr = Utils.projectedRadius(1, camera, distance, clientSize.width, clientSize.height);
					const width = screenConstantScale(pr, 10);

					profile.setWidth(width);
				}

				profile.addMarker(profile.points[profile.points.length - 1].clone());

				this.viewer.inputHandler.startDragging(
					profile.spheres[profile.spheres.length - 1]);
			} else if (e.button === THREE.MOUSE.RIGHT) {
				cancel.callback();
			}
		};

		cancel.callback = () => {
			profile.removeMarker(profile.points.length - 1);
			domElement.removeEventListener('mouseup', insertionCallback, false);
			this.viewer.removeEventListener('cancel_insertions', cancel.callback);
		};

		this.viewer.addEventListener('cancel_insertions', cancel.callback);
		domElement.addEventListener('mouseup', insertionCallback, false);

		profile.addMarker(new THREE.Vector3(0, 0, 0));
		this.viewer.inputHandler.startDragging(
			profile.spheres[profile.spheres.length - 1]);

		this.viewer.scene.addProfile(profile);

		return profile;
	}

	update () {
		const camera = this.viewer.scene.getActiveCamera();
		const profiles = this.viewer.scene.profiles;
		const renderAreaSize = this.viewer.renderer.getSize(new THREE.Vector2());
		const clientWidth = renderAreaSize.width;
		const clientHeight = renderAreaSize.height;

		this.light.position.copy(camera.position);

		// make size independent of distance
		for (const profile of profiles) {
			for (const sphere of profile.spheres) {
				const distance = camera.position.distanceTo(sphere.getWorldPosition(new THREE.Vector3()));
				const pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
				const scale = screenConstantScale(pr, 15);
				sphere.scale.set(scale, scale, scale);
			}
		}
	}

	render () {
		this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
	}

}
