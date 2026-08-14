import * as THREE from "three";
import { Volume, BoxVolume } from "../Volume";
import { Utils } from "../../utils";
import { EventDispatcher } from "../../EventDispatcher";

import { insertionScaleFromViewZ, labelScale, convertVolumeToDisplay } from "./volumeToolMath";

interface VolumeInsertionArgs {
	type?: new () => Volume;
	clip?: boolean;
	name?: string;
}

export class VolumeTool extends EventDispatcher {

	viewer: any;
	renderer: any;
	scene: THREE.Scene;
	onRemove: (e: any) => void;
	onAdd: (e: any) => void;

	constructor (viewer: any) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.addEventListener('start_inserting_volume', () => {
			this.viewer.dispatchEvent({
				type: 'cancel_insertions',
			});
		});

		this.scene = new THREE.Scene();
		this.scene.name = 'scene_volume';

		this.viewer.inputHandler.registerInteractiveScene(this.scene);

		this.onRemove = (e: any) => {
			this.scene.remove(e.volume);
		};

		this.onAdd = (e: any) => {
			this.scene.add(e.volume);
		};

		for (const volume of viewer.scene.volumes) {
			this.onAdd({ volume: volume });
		}

		this.viewer.inputHandler.addEventListener('delete', (e: any) => {
			const volumes = e.selection.filter((v: any) => (v instanceof Volume));
			volumes.forEach((v: any) => this.viewer.scene.removeVolume(v));
		});

		viewer.addEventListener("update", this.update.bind(this));
		viewer.addEventListener("render.pass.scene", (e: any) => this.render(e));
		viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));

		viewer.scene.addEventListener('volume_added', this.onAdd);
		viewer.scene.addEventListener('volume_removed', this.onRemove);
	}

	onSceneChange (e: any) {
		if (e.oldScene) {
			e.oldScene.removeEventListener('volume_added', this.onAdd);
			e.oldScene.removeEventListener('volume_removed', this.onRemove);
		}

		e.scene.addEventListener('volume_added', this.onAdd);
		e.scene.addEventListener('volume_removed', this.onRemove);
	}

	startInsertion (args: VolumeInsertionArgs = {}) {
		let volume: Volume;
		if (args.type) {
			volume = new args.type();
		} else {
			volume = new BoxVolume();
		}

		volume.clip = args.clip || false;
		volume.name = args.name || 'Volume';

		this.dispatchEvent({
			type: 'start_inserting_volume',
			volume: volume,
		});

		this.viewer.scene.addVolume(volume);
		this.scene.add(volume);

		const cancel: { callback: (e?: any) => void } = { callback: () => {} };

		const drag = (e: any) => {
			const camera = this.viewer.scene.getActiveCamera();

			const I = Utils.getMousePointCloudIntersection(
				e.drag.end,
				this.viewer.scene.getActiveCamera(),
				this.viewer,
				this.viewer.scene.pointclouds,
				{ pickClipped: false });

			if (I) {
				volume.position.copy(I.location);

				const wp = volume.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse);
				const w = insertionScaleFromViewZ(wp.z);
				volume.scale.set(w, w, w);
			}
		};

		const drop = () => {
			(volume as any).removeEventListener('drag', drag);
			(volume as any).removeEventListener('drop', drop);

			cancel.callback();
		};

		cancel.callback = () => {
			(volume as any).removeEventListener('drag', drag);
			(volume as any).removeEventListener('drop', drop);
			this.viewer.removeEventListener('cancel_insertions', cancel.callback);
		};

		(volume as any).addEventListener('drag', drag);
		(volume as any).addEventListener('drop', drop);
		this.viewer.addEventListener('cancel_insertions', cancel.callback);

		this.viewer.inputHandler.startDragging(volume);

		return volume;
	}

	update () {
		if (!this.viewer.scene) {
			return;
		}

		const camera = this.viewer.scene.getActiveCamera();
		const renderAreaSize = this.viewer.renderer.getSize(new THREE.Vector2());
		const clientWidth = renderAreaSize.width;
		const clientHeight = renderAreaSize.height;

		const volumes = this.viewer.scene.volumes;
		for (const volume of volumes) {
			const label = volume.label;

			{
				const distance = label.position.distanceTo(camera.position);
				const pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);

				const scale = labelScale(pr);
				label.scale.set(scale, scale, scale);
			}

			let calculatedVolume = volume.getVolume();
			calculatedVolume = convertVolumeToDisplay(
				calculatedVolume,
				this.viewer.lengthUnit.unitspermeter,
				this.viewer.lengthUnitDisplay.unitspermeter);
			const text = Utils.addCommas(calculatedVolume.toFixed(3)) + ' ' + this.viewer.lengthUnitDisplay.code + '³';
			label.setText(text);
		}
	}

	render (params: any) {
		const renderer = this.viewer.renderer;

		const oldTarget = renderer.getRenderTarget();

		if (params.renderTarget) {
			renderer.setRenderTarget(params.renderTarget);
		}
		renderer.render(this.scene, this.viewer.scene.getActiveCamera());
		renderer.setRenderTarget(oldTarget);
	}

}
