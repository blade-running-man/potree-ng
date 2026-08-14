
export * from "./Actions";
export * from "./AnimationPath";
export * from "./Annotation";
export * from "./defines";
export * from "./Enum";
export * from "./EventDispatcher";
export * from "./Features";
export * from "./KeyCodes";
export * from "./LRU";
export * from "./PointCloudEptGeometry";
export * from "./PointCloudOctree";
export * from "./PointCloudOctreeGeometry";
export * from "./PointCloudTree";
export * from "./Points";
export * from "./Potree_update_visibility";
export * from "./PotreeRenderer";
export * from "./ProfileRequest";
export * from "./TextSprite";
export * from "./utils";
export * from "./Version";
export * from "./WorkerPool";
export * from "./XHRFactory";
export * from "./viewer/SaveProject";
export * from "./viewer/LoadProject";

export * from "./materials/ClassificationScheme";
export * from "./materials/EyeDomeLightingMaterial";
export * from "./materials/Gradients";
export * from "./materials/NormalizationEDLMaterial";
export * from "./materials/NormalizationMaterial";
export * from "./materials/PointCloudMaterial";

export * from "./loader/POCLoader";
export * from "./modules/loader/2.0/OctreeLoader";
export * from "./loader/EptLoader";
export * from "./loader/ept/BinaryLoader";
export * from "./loader/ept/LaszipLoader";
export * from "./loader/ept/ZstandardLoader";
export * from "./loader/PointAttributes";
export * from "./loader/ShapefileLoader";
export * from "./loader/GeoPackageLoader";

export * from "./utils/Box3Helper";
export * from "./utils/ClippingTool";
export * from "./utils/ClipVolume";
export * from "./utils/GeoTIFF";
export * from "./utils/Measure";
export * from "./utils/MeasuringTool";
export * from "./utils/Message";
export * from "./utils/PointCloudSM";
export * from "./utils/PolygonClipVolume";
export * from "./utils/Profile";
export * from "./utils/ProfileTool";
export * from "./utils/ScreenBoxSelectTool";
export * from "./utils/SpotLightHelper";
export * from "./utils/TransformationTool";
export * from "./utils/Volume";
export * from "./utils/VolumeTool";
export * from "./utils/Compass";

export * from "./viewer/viewer";
export * from "./viewer/Scene";
export * from "./viewer/HierarchicalSlider";

export * from "./modules/OrientedImages/OrientedImages";
export * from "./modules/Images360/Images360";
export * from "./modules/CameraAnimation/CameraAnimation";

export * from "./modules/loader/2.0/OctreeLoader";

export {OrbitControls} from "./navigation/OrbitControls";
export {FirstPersonControls} from "./navigation/FirstPersonControls";
export {EarthControls} from "./navigation/EarthControls";
export {DeviceOrientationControls} from "./navigation/DeviceOrientationControls";
export {VRControls} from "./navigation/VRControls";

import "./extensions/OrthographicCamera";
import "./extensions/PerspectiveCamera";
import "./extensions/Ray";

import {LRU} from "./LRU";
import {OctreeLoader} from "./modules/loader/2.0/OctreeLoader";
import {POCLoader} from "./loader/POCLoader";
import {CopcLoader, EptLoader} from "./loader/EptLoader";
import {PointCloudOctree} from "./PointCloudOctree";
import {WorkerPool} from "./WorkerPool";

export const workerPool = new WorkerPool();

export const version = {
	major: 1,
	minor: 8,
	suffix: '.0'
};

export let lru = new LRU();

console.log('Potree ' + version.major + '.' + version.minor + version.suffix);

export let pointBudget = 1 * 1000 * 1000;
export let framenumber = 0;
export let numNodesLoading = 0;
export let maxNodesLoading = 4;

export const debug = {};

let scriptPath = "";

if (document.currentScript && document.currentScript.src) {
	scriptPath = new URL(document.currentScript.src + '/..').href;
	if (scriptPath.slice(-1) === '/') {
		scriptPath = scriptPath.slice(0, -1);
	}
} else if(import.meta){
	scriptPath = new URL(import.meta.url + "/..").href;
	if (scriptPath.slice(-1) === '/') {
		scriptPath = scriptPath.slice(0, -1);
	}
}else {
	console.error('Potree was unable to find its script path using document.currentScript. Is Potree included with a script tag? Does your browser support this function?');
}

let resourcePath = scriptPath + '/resources';

// scriptPath: build/potree
// resourcePath:build/potree/resources
export {scriptPath, resourcePath};


export function loadPointCloud(path, name, callback){
	let loaded = function(e){
		e.pointcloud.name = name;
		callback(e);
	};

	let promise = new Promise( resolve => {

		// load pointcloud
		if (!path){
			// TODO: callback? comment? Hello? Bueller? Anyone?
		} else if (path.includes('ept.json')) {
			EptLoader.load(path, function(geometry) {
				if (!geometry) {
					console.error(new Error(`failed to load point cloud from URL: ${path}`));
				}
				else {
					let pointcloud = new PointCloudOctree(geometry);
					resolve({type: 'pointcloud_loaded', pointcloud: pointcloud});
				}
			});
		} else if (path.includes('.copc.laz')) {
			CopcLoader.load(path, function(geometry) {
				if (!geometry) {
					console.error(new Error(`failed to load point cloud from URL: ${path}`));
				}
				else {
					let pointcloud = new PointCloudOctree(geometry);
					resolve({type: 'pointcloud_loaded', pointcloud: pointcloud});
				}
			});
		} else if (path.indexOf('cloud.js') > 0) {
			POCLoader.load(path, function (geometry) {
				if (!geometry) {
					//callback({type: 'loading_failed'});
					console.error(new Error(`failed to load point cloud from URL: ${path}`));
				} else {
					let pointcloud = new PointCloudOctree(geometry);
					// loaded(pointcloud);
					resolve({type: 'pointcloud_loaded', pointcloud: pointcloud});
				}
			});
		} else if (path.indexOf('metadata.json') > 0) {
			Potree.OctreeLoader.load(path).then(e => {
				let geometry = e.geometry;

				if(!geometry){
					console.error(new Error(`failed to load point cloud from URL: ${path}`));
				}else{
					let pointcloud = new PointCloudOctree(geometry);

					let aPosition = pointcloud.getAttribute("position");

					let material = pointcloud.material;
					material.elevationRange = [
						aPosition.range[0][2],
						aPosition.range[1][2],
					];

					// loaded(pointcloud);
					resolve({type: 'pointcloud_loaded', pointcloud: pointcloud});
				}
			});

			OctreeLoader.load(path, function (geometry) {
				if (!geometry) {
					//callback({type: 'loading_failed'});
					console.error(new Error(`failed to load point cloud from URL: ${path}`));
				} else {
					let pointcloud = new PointCloudOctree(geometry);
					// loaded(pointcloud);
					resolve({type: 'pointcloud_loaded', pointcloud: pointcloud});
				}
			});
		} else if (path.indexOf('.vpc') > 0) {
			PointCloudArena4DGeometry.load(path, function (geometry) {
				if (!geometry) {
					//callback({type: 'loading_failed'});
					console.error(new Error(`failed to load point cloud from URL: ${path}`));
				} else {
					let pointcloud = new PointCloudArena4D(geometry);
					// loaded(pointcloud);
					resolve({type: 'pointcloud_loaded', pointcloud: pointcloud});
				}
			});
		} else {
			//callback({'type': 'loading_failed'});
			console.error(new Error(`failed to load point cloud from URL: ${path}`));
		}
	});

	if(callback){
		promise.then(pointcloud => {
			loaded(pointcloud);
		});
	}else{
		return promise;
	}
};


// add selectgroup
(function($){
	$.fn.extend({
		selectgroup: function(args = {}){

			let elGroup = $(this);
			let rootID = elGroup.prop("id");
			let groupID = `${rootID}`;
			let groupTitle = (args.title !== undefined) ? args.title : "";

			let elButtons = [];
			elGroup.find("option").each((index, value) => {
				let buttonID = $(value).prop("id");
				let label = $(value).html();
				let optionValue = $(value).prop("value");

				let elButton = $(`
					<span style="flex-grow: 1; display: inherit">
					<label for="${buttonID}" class="ui-button" style="width: 100%; padding: .4em .1em">${label}</label>
					<input type="radio" name="${groupID}" id="${buttonID}" value="${optionValue}" style="display: none"/>
					</span>
				`);
				let elLabel = elButton.find("label");
				let elInput = elButton.find("input");

				elInput.change( () => {
					elGroup.find("label").removeClass("ui-state-active");
					elGroup.find("label").addClass("ui-state-default");
					if(elInput.is(":checked")){
						elLabel.addClass("ui-state-active");
					}else{
						//elLabel.addClass("ui-state-default");
					}
				});

				elButtons.push(elButton);
			});

			let elFieldset = $(`
				<fieldset style="border: none; margin: 0px; padding: 0px">
					<legend>${groupTitle}</legend>
					<span style="display: flex">

					</span>
				</fieldset>
			`);

			let elButtonContainer = elFieldset.find("span");
			for(let elButton of elButtons){
				elButtonContainer.append(elButton);
			}

			elButtonContainer.find("label").each( (index, value) => {
				$(value).css("margin", "0px");
				$(value).css("border-radius", "0px");
				$(value).css("border", "1px solid black");
				$(value).css("border-left", "none");
			});
			elButtonContainer.find("label:first").each( (index, value) => {
				$(value).css("border-radius", "4px 0px 0px 4px");

			});
			elButtonContainer.find("label:last").each( (index, value) => {
				$(value).css("border-radius", "0px 4px 4px 0px");
				$(value).css("border-left", "none");
			});

			elGroup.empty();
			elGroup.append(elFieldset);



		}
	});
})(jQuery);
