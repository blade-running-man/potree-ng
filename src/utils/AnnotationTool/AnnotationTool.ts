import * as THREE from "three";
import { Annotation } from "../../Annotation";
import { Utils } from "../../utils";
import { EventDispatcher } from "../../EventDispatcher";

import { resolveInsertionAction } from "./annotationToolMath";

export class AnnotationTool extends EventDispatcher {

	viewer: any;
	renderer: any;
	sg: THREE.SphereGeometry;
	sm: THREE.MeshNormalMaterial;
	s: THREE.Mesh;

	constructor (viewer: any) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.sg = new THREE.SphereGeometry(0.1);
		this.sm = new THREE.MeshNormalMaterial();
		this.s = new THREE.Mesh(this.sg, this.sm);
	}

	startInsertion (_args: any = {}) {
		const domElement = this.viewer.renderer.domElement;

		const annotation = new Annotation({
			position: [589748.270, 231444.540, 753.675],
			title: "Annotation Title",
			description: `Annotation Description`,
		});
		this.dispatchEvent({ type: 'start_inserting_annotation', annotation: annotation });

		const annotations = this.viewer.scene.annotations;
		annotations.add(annotation);

		const callbacks: { cancel: (e?: any) => void; finish: (e?: any) => void } = {
			cancel: () => {},
			finish: () => {},
		};

		const insertionCallback = (e: any) => {
			const action = resolveInsertionAction(e.button, THREE.MOUSE.LEFT, THREE.MOUSE.RIGHT);
			if (action === "finish") {
				callbacks.finish();
			} else if (action === "cancel") {
				callbacks.cancel();
			}
		};

		callbacks.cancel = () => {
			annotations.remove(annotation);

			domElement.removeEventListener('mouseup', insertionCallback, true);
		};

		callbacks.finish = () => {
			domElement.removeEventListener('mouseup', insertionCallback, true);
		};

		domElement.addEventListener('mouseup', insertionCallback, true);

		const drag = (e: any) => {
			const I = Utils.getMousePointCloudIntersection(
				e.drag.end,
				e.viewer.scene.getActiveCamera(),
				e.viewer,
				e.viewer.scene.pointclouds,
				{ pickClipped: true });

			if (I) {
				this.s.position.copy(I.location);

				annotation.position.copy(I.location);
			}
		};

		const drop = () => {
			this.viewer.scene.scene.remove(this.s);
			(this.s as any).removeEventListener("drag", drag);
			(this.s as any).removeEventListener("drop", drop);
		};

		(this.s as any).addEventListener('drag', drag);
		(this.s as any).addEventListener('drop', drop);

		this.viewer.scene.scene.add(this.s);
		this.viewer.inputHandler.startDragging(this.s);

		return annotation;
	}

	update () {

	}

	render () {

	}
}
