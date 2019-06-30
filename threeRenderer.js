var camera, scene, renderer;
var effect, controls;
var element, container;
var extent;
var offset;
var world_size = [];
var camMinY = 0.005;
var railPaths = [];
// animation vars
var animateCamera = false;
var animationStart;
var animationPath;
var TTW = 2.915; //track texture width
var TTL = TTW * 2.0; //track texture length
var loader;
var buildingIds = [];

var clock = new THREE.Clock();

function initModelViewer() {
	loader = new THREE.TextureLoader();
	loader.crossOrigin = true;
	console.log('init 3d model renderer');
	renderer = new THREE.WebGLRenderer();
	element = renderer.domElement;
	container = document.getElementById('viewport3d')
		var html = document.documentElement;
	$(container).empty();
	//$(container).height(html.clientHeight - 50);
	//$(container).width(html.clientWidth - 50);
	var w = $(container).width();
	var h = $(container).height();
	renderer.setSize(w, h);
	container.appendChild(element);
	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(60, w / h, 0.001, 3500);
	//camera.position.set(-500, 10.0, 500);
	camera.position.set(0, 10.0, 50);
	scene.add(camera);

	initFirstPersonControls();

	var light = new THREE.HemisphereLight(0xaaaaaa, 0x000000, 1.0);
	scene.add(light);

	//initDummy();

	window.addEventListener('resize', resize, false);
	setTimeout(resize, 1);
	animate();
}

function initFirstPersonControls() {
	controls = new THREE.FirstPersonControls(camera, container);
	controls.movementSpeed = 1000;
	controls.lookSpeed = 0.1;
	//controls.lat = 0;
	//controls.lon = 0;
}

function initControls() {
	controls = new THREE.OrbitControls(camera, container);
	controls.rotateUp(Math.PI / 4);
	controls.target.set(
		camera.position.x + 0.1,
		camera.position.y,
		camera.position.z);
	//controls.noZoom = true;
	//controls.noPan = false;

	function setOrientationControls(e) {
		if (!e.alpha) {
			return;
		}

		controls = new THREE.DeviceOrientationControls(camera, true);
		controls.connect();
		controls.update();

		element.addEventListener('click', fullscreen, false);

		window.removeEventListener('deviceorientation', setOrientationControls, true);
	}
	window.addEventListener('deviceorientation', setOrientationControls, true);
}

function initDummy() {
	var coords = '';
	var xmlString = '<Track><Location><GeographicLocation><LineString><coordinates>160759.100000001,502779.594000001 160732.850000001,503207.114999998 160726.809999999,503314.820999999 160721.894000001,503411.263 160715.285,503549.013 160712.291000001,503614.096000001 160709.866999999,503675.307999998 160708.647,503716.776000001 160708.329,503734.030000001 160708.079,503754.500999998 160708.079,503781.886 160708.265000001,503812.368999999 160708.734999999,503839.259 160709.765000001,503871.486000001 160710.921999998,503896.927999999 160712.155000001,503920.756000001 160713.793000001,503947.146000002 160715.701000001,503972.541999999 160717.761,503997.43 160719.458999999,504016.079999998 160722.326000001,504044.645 160726.164000001,504078.054000001 160728.089000002,504093.313999999 160732.090999998,504123.454 160736.984999999,504156.831999999 160741.517000001,504185.177000001 160743.931000002,504199.377999999 160747.785999998,504221.159000002 160752.579999998,504247.171999998 160758.046999998,504274.752999999 160763.633000001,504301.18 160768.294,504322.046 160775.035,504351.291000001 160780.388,504373.412 160786.537999999,504397.903999999 160791.175999999,504415.927000001 160795.625,504432.657000002 160802.899999999,504458.618999999 160809.138,504480.412999999 160812.93,504493.186999999 160821.010000002,504519.638999999 160830.607999999,504549.796999998 160840.059,504578.239 160849.901000001,504607.219000001 160865.853,504651.964000002 160881.800000001,504695.282000002 160913.120000001,504779.293000001 160923.706,504806.905000001 160955.941,504892.811999999</coordinates></LineString></GeographicLocation></Location></Track>';
	var list = [];
	list.push($.parseXML(xmlString));
	var dummyTypeMap = new Object();
	var entry = new Object({
			color: '#ff0000',
			list: list
		});
	dummyTypeMap['Track'] = entry;
	buildScene(dummyTypeMap);
}

function initPlane() {

	var texture = loader.load('textures/patterns/checker.png');

	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat = new THREE.Vector2(50, 50);
	texture.anisotropy = renderer.getMaxAnisotropy();

	var material = new THREE.MeshPhongMaterial({
			color: 0xffffff,
			specular: 0xffffff,
			shininess: 20,
			shading: THREE.FlatShading,
			map: texture,
			polygonOffset: true,
			polygonOffsetFactor: 10,
		});
	var step = 80.0;
	var w = (world_size[0] - (world_size[0] % step)) + step;
	var h = (world_size[1] - (world_size[1] % step)) + step;
	var repeatS = (w / step);
	var repeatT = (h / step);
	//console.log('repeat: ' + repeatS + ',' + repeatT);
	texture.repeat = new THREE.Vector2(repeatS, repeatT);
	var geometry = new THREE.PlaneBufferGeometry(w, h, repeatS, repeatT);

	var mesh = new THREE.Mesh(geometry, material);
	//mesh.renderOrder = 0;
	mesh.rotation.x = -Math.PI / 2;
	scene.add(mesh);
}

function buildScene(typeMap, railConnections) {
	calcExtent(typeMap);
	createTrackMap(typeMap.Track);
	createPassageMap(typeMap.Passage);
	buildRailConnections(railConnections);

	console.log('Extent: ' + extent);
	initPlane();
	fillTracklist();
	//createTracks(typeMap.Track);
	//createTracks(typeMap.Passage);

	createSignals(typeMap.Signal);
	//createBufferstops(typeMap.BufferStop);
	//createOverheadLineMasts(typeMap.OverheadLineMast);
	//createOverheadLineMasts(typeMap.OverheadLineSupport);
	//createFurniture(typeMap.ElectricityCabinet, 'models/kast_groot.json');
	//createFurniture(typeMap.GasCabinet, 'models/kast_klein.json');
	//createBuildings(typeMap.Track);
}

function buildRailConnections(railConnections) {
	var depthIndex = 4;
	$.each(railConnections, function (index, railConnection) {
		var rc = $(railConnection);
		var puic = rc.attr('puic');
		//console.log('building: '+puic);
		var tr = rc.attr('trackRef');
		var passageRefs = rc.attr('passageRefs').split(' ');

		var lines = [];
		if (tr) {
			var track = trackMap.get(tr);
			lines.push(getGmlCoords(track));
		}
		var firstJunction;
		if (passageRefs) {
			var junctions = [];
			$.each(passageRefs, function (index, passageRef) {
				var passage = passageMap.get(passageRef);
				if (passage) {
					junctions.push(passage.parentNode);
					lines.push(getGmlCoords(passage));
				}
			});
			$.each(junctions, function (index, junction) {
				if (firstJunction) {
					if ($(junction).attr('name') > $(firstJunction).attr('name')) {
						firstJunction = junction;
					}
				} else {
					firstJunction = junction;
				}
			});
		}
		//console.log('lines: ' + lines.length);
		var points = joinLines(lines, firstJunction);
		//console.log('joined: ' + points);
		//console.log('joined: ' + points.length);
		dedubPoints(points);
		var name = rc.attr('name');
		if (points.length > 1) {
			//console.log('adding Track: ' + name);
			var path = buildPath(points);
			railPaths.push({
				puic: puic,
				path: path,
				name: name
			});
			var mesh = buildTrackMesh(path, points.length, depthIndex++);
			scene.add(mesh);
		} else {
			console.error("not enough points for puic " + puic);
		}
	});
}

function joinLines(lines, firstJunction) {
	var count = lines.length;
	var points = lines[0];
	lines.splice(0, 1);
	while (lines.length < count) {
		count = lines.length;
		for (var i = 0; lines.length; i++) {
			var baseP1 = points[0];
			var baseP2 = points[points.length - 1];
			var line = lines[i];
			var p1 = line[0];
			var p2 = line[line.length - 1];
			if (pointEqual(baseP1, p2)) {
				points = line.concat(points);
				lines.splice(i, 1);
				break;
			} else if (pointEqual(baseP2, p1)) {
				points = points.concat(line);
				lines.splice(i, 1);
				break;
			} else if (pointEqual(baseP1, p1)) {
				line = line.reverse();
				points = line.concat(points);
				lines.splice(i, 1);
				break;
			} else if (pointEqual(baseP2, p2)) {
				line = line.reverse();
				points = points.concat(line);
				lines.splice(i, 1);
				break;
			}
		}
	}
	if (firstJunction) {
		var firstPoint = getGmlCoords(firstJunction)[0];
		if (!pointEqual(firstPoint, points[0])) {
			points.reverse();
		}
	}
	if (lines.length !== 0) {
		console.error('not all segments connected');
	}
	return points;
}

function pointEqual(p1, p2) {
	return p1[0] === p2[0] && p1[1] === p2[1];
}

function dedubPoints(points) {
	for (var i = 0; i < points.length - 1; i++) {
		var p1 = points[i];
		var p2 = points[i + 1];
		if (p1[0] === p2[0] && p1[1] === p2[1]) {
			points.splice(i, 1);
		}
	}
	//console.log('dedub: ' + points);
	//console.log('dedub: ' + points.length);
}

function buildRailConnectionMap(railConnections) {
	railConnection2TrackMap = [];
	$.each(railConnections, function (index, railConnection) {
		var puic = $(railConnection).attr('puic');
		var tr = $(railConnection).attr('trackRef');
		if (tr) {
			railConnection2TrackMap.push([tr, puic]);
		}
	});
}

function buildFullRailConnections(railConnections, typeMap) {
	$.each(railConnections, function (index, railConnection) {
		var track;
		var passages = [];
		var tr = $(railConnection).attr('trackRef');
		var tr = $(railConnection).attr('passageRefs');
		if (tr) {
			track = findTrack(tr);
		}

	});
}

function findTrack(typeMap, ref) {
	var track;
	var tracks = typeMap.Track;
	for (var i = 0; i < tracks.length; i++) {
		if ($(tracks[i]).attr('puic') == ref) {
			return tracks[i];
		}
	}
	return undefined;
}

function fillTracklist() {
	var list = $('#tracklist');
	$.each(railPaths, function (index, track) {
		//console.log('add track: ' + track.name);
		var item = $('<li></li>');
		var content = $('<a></a>').text(track.name);
		content.on('click', function () {
			flyoverTrack(track.puic);
		});
		var pl = '' + track.path.getLength();
		pl = pl.split('.')[0];
		var badge = $('<span></span>').text('' + pl + 'm').addClass('badge pull-right');
		badge.css({
			"backgroundColor": '#428bca'
		});
		content.append(badge)
		item.append(content);

		list.append(item);
	});
}

function flyoverTrack(puic) {
	console.log('fly!!! ' + puic);
	var pos = camera.position;
	animationPath = getPathByPuic(puic);
	animationStart = Date.now();
	animateCamera = true;
}

function calcExtent(typeMap) {
	var minX = Number.MAX_VALUE;
	var minY = Number.MAX_VALUE;
	var maxX = Number.MIN_VALUE;
	var maxY = Number.MIN_VALUE;
	var tracks = typeMap.Track.list;
	for (var i = 0; i < tracks.length; i++) {
		var coords = getGmlCoords(tracks[i]);
		for (var j = 0; j < coords.length; j++) {
			var x = coords[j][0];
			var y = coords[j][1];
			//console.log('x,y: ' + x + ' ' + y);
			minX = Math.min(x, minX);
			minY = Math.min(y, minY);
			maxX = Math.max(x, maxX);
			maxY = Math.max(y, maxY);
		}

	}
	extent = [];
	extent.push(minX);
	extent.push(minY);
	extent.push(maxX);
	extent.push(maxY);
	var cx = minX + ((maxX - minX) / 2.0);
	var cy = minY + ((maxY - minY) / 2.0);
	var w = maxX - minX;
	var h = maxY - minY;
	world_size.push(w);
	world_size.push(h);
	console.log('width: ' + w);
	console.log('height: ' + (maxY - minY));

	offset = []
	offset.push(cx);
	offset.push(cy);
	scale = 1.0;
	console.log('offset: ' + offset);

}

function wktCoordStr(coords) {
	var l = coords.length;
	var str = '';
	str += '' + coords[0][0].split('.')[0];
	str += ' ';
	str += '' + coords[0][1].split('.')[0];
	for (var i = 1; i < l; i++) {
		str += ',';
		str += '' + coords[i][0].split('.')[0];
		str += ' ';
		str += '' + coords[i][1].split('.')[0];
	}

	//console.log(str);
	return str;
}

function getGmlCoords(item) {
	var points = [];
	var $item = $(item);
	var poslist = $item.find('GeographicLocation').text().trim();

	if (poslist != undefined) {
		var coords = poslist.split(' ');
		for (var j = 0; j < coords.length; j++) {
			var values = coords[j].split(',');
			points.push(values);
		}
	}
	return points;
}

function createTrackMap(renderableObjects) {
	trackMap = new Map();
	if (!renderableObjects) {
		return;
	}
	$.each(renderableObjects.list, function (index, item) {
		var $item = $(item);
		var puic = getPuic($item);
		//var points = getGmlCoords(item);
		trackMap.set(puic, item);
	});
}

function createPassageMap(renderableObjects) {
	passageMap = new Map();
	if (!renderableObjects) {
		return;
	}
	$.each(renderableObjects.list, function (index, item) {
		var $item = $(item);
		var puic = getPuic($item);
		//var points = getGmlCoords(item);
		passageMap.set(puic, item);
	});
}

function createTracks(renderableObjects) {
	if (!renderableObjects) {
		return;
	}
	$.each(renderableObjects.list, function (index, item) {
		var $item = $(item);
		var puic = getPuic($item);
		var trackName = $item.attr('name');
		console.log(trackName);
		var points = getGmlCoords(item);
		if (points !== undefined && points.length > 1) {
			var path = buildPath(points);
			railPaths.push({
				puic: puic,
				path: path,
				name: trackName
			});
			var mesh = buildTrackMesh(path, points.length, index);
			mesh.renderDepth = index;
			scene.add(mesh);
		} else {
			console('no points for puic ' + puic);
		}
	});
}

function createSignals(renderableObjects) {
	if (!renderableObjects) {
		return;
	}
	buildSignalsFromModel(renderableObjects);
}
var smbHeight = 3.75;
var smbPoleGeom = new THREE.BoxGeometry(0.15, smbHeight, 0.15);

function buildSMBPole() {
	var material = new THREE.MeshPhongMaterial({
			color: 0xc0c0c0
		});
	var mesh = new THREE.Mesh(smbPoleGeom, material);
	mesh.position.set(0, smbHeight / 2.0, 0);
	return mesh;
}

var smbSignGeom = new THREE.PlaneGeometry(0.5, 0.5);
function buildSMBSign() {
	var signTexture = loader.load('textures/SMB.png');
	signTexture.needsUpdate = true;

	//geometry.computeBoundingBox();
	//geometry.computeVertexNormals();
	var frontMaterial = new THREE.MeshPhongMaterial({
			color: 0xffffff,
			specular: 0xffffff,
			shininess: 20,
			side: THREE.FrontSide,
			shading: THREE.FlatShading,
			map: signTexture
		});
	var backMaterial = new THREE.MeshPhongMaterial({
			color: 0xffffff,
			specular: 0xffffff,
			shininess: 10,
			side: THREE.BackSide,
			shading: THREE.FlatShading,
		});
	var materials = [frontMaterial, backMaterial];
	var sign = THREE.SceneUtils.createMultiMaterialObject(smbSignGeom, materials);
	sign.position.x = 0.3;
	sign.position.y = 3.5;
	sign.rotateY(Math.PI * 0.5);
	return sign;
}

function buildSignalsFromModel(renderableObjects) {
	if (!renderableObjects) {
		return;
	}
	var material = new THREE.MeshPhongMaterial({
			color: 0xc0c0c0
		});
	var jsonloader = new THREE.JSONLoader();
	$.each(renderableObjects.list, function (index, item) {
		jsonloader.load('models/signal.json', function (geometry) {
			geometry.computeBoundingBox();
			geometry.computeVertexNormals();
			var point = getGmlCoords(item)[0];
			var $item = $(item);
			var parentObject = new THREE.Object3D();
			var mesh = new THREE.Mesh(geometry, material);
			var textMesh = buildSignalName($item.attr('name'));
			parentObject.add(mesh);
			parentObject.add(textMesh);
			var point = getGmlCoords(item)[0];
			var $item = $(item);
			var tri = $item.find('RailConnectionInfo');
			var direction = tri.attr('direction');
			var rcRef = tri.attr('railConnectionRef');
			var measure = parseFloat(tri.attr('atMeasure'));
			var path = getPathByPuic(rcRef);
			if (path && measure < path.getLength()) {
				//console.log('path length: '+path.getLength()+' measure: '+measure + ' t='+measure/path.getLength());
				var tan = path.getTangentAt(measure / path.getLength());
				var angle = Math.PI * 1.5 + Math.atan2(tan.x, tan.z);
				if (direction === 'Downstream') {
					angle += Math.PI;
				}
				//console.log('adding Signal: ' + $item.attr('name'));
				parentObject.rotation.set(0.0, angle, 0.0);
				var x =  - (point[0] - offset[0]);
				var y = point[1] - offset[1];
				parentObject.position.set(x, 0.0, y);
				scene.add(parentObject);

				if (index == 0) {
					camera.position.set(x, 10.0, y);
					console.log('set camera to first track position: ' + x + ',' + y);
					return;
				}
			} else {
				console.log('path or measure not found for: ' + $item.attr('puic'));
			}
		});

	});
}

function buildSMBsFromModel(renderableObjects) {
	$.each(renderableObjects.list, function (index, item) {
		if (isRelevantSignal(item)) {
			var point = getGmlCoords(item)[0];
			var $item = $(item);
			var parentObject = new THREE.Object3D();
			parentObject.add(buildSMBPole());
			parentObject.add(buildSMBSign());
			parentObject.add(buildSignalName($item.attr('name')));
			var point = getGmlCoords(item)[0];
			var tri = getTrackRelationInfo($item);
			var direction = tri.attr('direction');
			var trackRef = getTrackRef(tri);
			var measure = parseFloat(tri.attr('atMeasure'));
			var path = getPathByPuic(trackRef);
			if (path && measure < path.getLength()) {
				//console.log('path length: '+path.getLength()+' measure: '+measure + ' t='+measure/path.getLength());
				var tan = path.getTangentAt(measure / path.getLength());
				var angle = Math.PI * 1.5 + Math.atan2(tan.x, tan.z);
				if (direction === 'Downstream') {
					angle += Math.PI;
				}
				console.log('adding Signal: ' + $item.attr('name'));
				parentObject.rotation.set(0.0, angle, 0.0);
				var x =  - (point[0] - offset[0]);
				var y = point[1] - offset[1];
				parentObject.position.set(x, 0.0, y);
				scene.add(parentObject);

				if (index == 0) {
					camera.position.set(x, 10.0, y);
					console.log('set camera to first track position: ' + x + ',' + y);
					return;
				}
			} else {
				console.log('path or measure not found for: ' + $item.attr('puic'));
			}
		}
	});
}

function isRelevantSignal(signal) {
	var st = $(signal).attr('signalType');
	if (st == 'Controlled') {
		return true;
	}
	return false;
}

function getTrackRelationInfo($item) {
	var tri = $item.find('TrackRelationInfo')[0];
	if (tri == undefined) {
		tri = $item.find('RailConnectionInfo')[0];
	}
	return $(tri);
}

function getTrackRef($item) {
	var ref = $item.attr('trackRef');
	if (ref == undefined) {
		ref = $item.attr('railConnectionRef');
	}
	return ref;
}

function buildSignalName(text) {
	var canvas = document.createElement('canvas');
	var spriteW = 256;
	var spriteH = 64;
	canvas.width = spriteW;
	canvas.height = spriteH;
	var context = canvas.getContext('2d');
	context.font = "Bold 40px Arial";
	context.fillStyle = "rgb(255,255,0)";
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = "rgb(0,0,0)";
	context.fillRect(3, 3, canvas.width - 6, canvas.height - 6);
	context.fillStyle = "rgb(255,255,0)";
	context.fillStyle = "rgb(255,255,0)";
	context.fillText(text, 20, 45);

	var textTexture = new THREE.Texture(canvas);
	textTexture.needsUpdate = true;

	var geometry = new THREE.PlaneGeometry(1, spriteH / spriteW);
	var frontMaterial = new THREE.MeshPhongMaterial({
			color: 0xffffff,
			specular: 0xffffff,
			shininess: 20,
			side: THREE.FrontSide,
			shading: THREE.FlatShading,
			map: textTexture,
		});
	var backMaterial = new THREE.MeshPhongMaterial({
			color: 0xffffff,
			specular: 0xffffff,
			shininess: 10,
			side: THREE.BackSide,
			shading: THREE.FlatShading
		});
	var materials = [frontMaterial, backMaterial];
	var textSign = THREE.SceneUtils.createMultiMaterialObject(geometry, materials);
	textSign.position.x = 0.3;
	textSign.position.y = 2.5;
	textSign.rotateY(Math.PI * 0.5);
	return textSign;

}

function createFurniture(renderableObjects, modelPath) {
	if (!renderableObjects) {
		return;
	}
	console.log('build Furniture: ' + renderableObjects.list.length);
	var material = new THREE.MeshLambertMaterial({
			color: 0x576065
		});
	var jsonloader = new THREE.JSONLoader();
	jsonloader.load(modelPath, function (geometry) {
		geometry.computeBoundingBox();
		geometry.computeVertexNormals();
		$.each(renderableObjects.list, function (index, item) {
			var mesh = new THREE.Mesh(geometry, material);
			var point = getGmlCoords(item)[0];
			var $item = $(item);

			var x =  - (point[0] - offset[0]);
			var y = point[1] - offset[1];
			mesh.position.set(x, 0.0, y);
			scene.add(mesh);
		});
	});
}

function createBuildings(tracks) {
	var buildingMaterials = [];
	buildingMaterials.push(new THREE.MeshPhongMaterial({
			color: 0xff0000,
			//side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.5
		}));
	buildingMaterials.push(new THREE.MeshPhongMaterial({
			color: 0x00ff00,
			//side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.5
		}));
	$.each(tracks.list, function (index, track) {
		var coords = getGmlCoords(track);
		var wktStr = 'LINESTRING (' + wktCoordStr(coords) + ')';
		getBuildingsWkt(wktStr, 500, function (data) {
			$.each(data.features, function (index, feature) {
				var bid = feature.id;
				//console.log(bid +' index: '+buildingIds.indexOf(bid));
				reportBuilding(feature);
				if (buildingIds.indexOf(bid) === -1) {
					buildingIds.push(bid);
					createBuildingMesh(feature, buildingMaterials);
				}

			});
		});
	});

	//getBuildings(trackBufferGeom, function(data) {
	//	console.log('data ontvangen');
	//	console.log(data);
	//});

}

function reportBuilding(feature) {
	var polyArray = feature.geometry.coordinates[0];
	if ("Polygon" === feature.geometry.type) {
		polyArray = [];
		polyArray.push(feature.geometry.coordinates[0]);
	}
	if (polyArray.length > 1) {
		console.log(feature);
	}
}

function createBuildingMesh(feature, buildingMaterials) {
	var polyArray = feature.geometry.coordinates[0];
	if ("Polygon" === feature.geometry.type) {
		polyArray = [];
		polyArray.push(feature.geometry.coordinates[0]);
	}
	var matIndex = 0;
	if ('woonfunctie' === feature.properties.gebruiksdoel) {
		matIndex = 1;
	}
	var material = buildingMaterials[matIndex];
	$.each(polyArray, function (index, pc) {
		var x =  - (pc[0][0] - offset[0]);
		var y = pc[0][1] - offset[1];
		var shape = new THREE.Shape();
		shape.moveTo(x, y);
		for (var i = 1; i < pc.length; i++) {
			var ix =  - (pc[i][0] - offset[0]);
			var iy = pc[i][1] - offset[1];
			shape.lineTo(ix, iy);
		}
		var extrudeSettings = {
			steps: 1,
			amount: 3,
			bevelEnabled: false
		};

		var geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

		var mesh = new THREE.Mesh(geometry, material);
		mesh.rotation.x = Math.PI / 2;
		mesh.position.y = 3 * (index + 1);
		scene.add(mesh);
	});
}

function createBufferstops(renderableObjects) {
	if (!renderableObjects) {
		return;
	}
	console.log('build bufferstops: ' + renderableObjects.list.length);
	var material = new THREE.MeshPhongMaterial({
			color: 0xc0c0c0
		});
	var jsonloader = new THREE.JSONLoader();
	jsonloader.load('models/bufferstop.json', function (geometry) {
		geometry.computeBoundingBox();
		var scale = 1.500 / geometry.boundingBox.max.y;
		$.each(renderableObjects.list, function (index, item) {
			var mesh = new THREE.Mesh(geometry, material);
			var point = getGmlCoords(item)[0];
			var x =  - (point[0] - offset[0]);
			var y = point[1] - offset[1];
			mesh.position.set(x, 0.0, y);
			mesh.scale.set(scale, scale, scale);
			scene.add(mesh);
		});
	});
}

function createOverheadLineMasts(renderableObjects) {
	if (!renderableObjects) {
		return;
	}
	console.log('build OverheadLineMasts: ' + renderableObjects.list.length);
	var material = new THREE.MeshPhongMaterial({
			color: 0xc0c0c0
		});
	var mastHeight = 7.0;
	var geometry = new THREE.BoxGeometry(0.22, mastHeight, 0.22);
	$.each(renderableObjects.list, function (index, item) {
		var mesh = new THREE.Mesh(geometry, material);
		var point = getGmlCoords(item)[0];
		var $item = $(item);
		var x =  - (point[0] - offset[0]);
		var y = point[1] - offset[1];
		mesh.position.set(x, mastHeight / 2.0, y);
		scene.add(mesh);
	});
}

function getPathByPuic(puic) {
	for (var i = 0; i < railPaths.length; i++) {
		if (railPaths[i].puic === puic) {
			return railPaths[i].path;
		}
	}
	return undefined;
}

function buildSignal(path, atM) {

	var point = path.getPointAt(atM);
	var tan = path.getTangentAt(atM);
	console.log('tangent: ' + tan);

}

function buildPath(points) {
	var newPoints2d = [];
	$.each(points, function (index, values) {
		var x =  - (values[0] - offset[0]);
		var y = values[1] - offset[1];
		newPoints2d.push(new THREE.Vector2(x, y));
	});
	var tempPath = new THREE.Path(newPoints2d);
	var divisions = Math.ceil(tempPath.getLength() / TTL);
	//console.log('divisions ' + divisions);
	var spacedPoints = tempPath.getSpacedPoints(divisions);
	//console.log('spacedPoints ' + spacedPoints.length);
	var newPoints3d = [];
	$.each(spacedPoints, function (index, p) {
		newPoints3d.push(new THREE.Vector3(p.x, 0.0, p.y));
	});
	return new THREE.CatmullRomCurve3(newPoints3d);
}

function buildTrackMesh(path, segmentCount, depthIndex) {
	var radius = TTW / 2.0;
	var radiusSegments = 2;
	var closed = false;
	var segments = Math.round(path.getLength() / TTL);
	var geom = new TrackGeometry(path, segments, radius, radiusSegments, closed);
	//rails_texture = THREE.ImageUtils.loadTexture('textures/railway_track.jpg');
	var rails_texture = loader.load('textures/rails.png');
	rails_texture.wrapS = THREE.RepeatWrapping;
	rails_texture.wrapT = THREE.RepeatWrapping;
	//console.log('length: '+path.getLength());
	//console.log('scale: '+scale);
	//console.log('textureL: '+textureL);

	//console.log('repeat: '+repeat);
	rails_texture.repeat = new THREE.Vector2(segments, 2);
	rails_texture.anisotropy = renderer.getMaxAnisotropy();

	var material = new THREE.MeshPhongMaterial({
			color: 0xffffff,
			specular: 0xffffff,
			shininess: 20,
			shading: THREE.FlatShading,
			map: rails_texture,
			polygonOffset: true,
			polygonOffsetFactor:  - depthIndex
		});

	var mesh = new THREE.Mesh(geom, material);
	return mesh;
}

function resize() {
	var html = document.documentElement;
	//$(container).height(html.clientHeight - 50);
	//$(container).width(html.clientWidth - 50);
	var w = $(container).width();
	var h = $(container).height();

	camera.aspect = w / h;
	camera.updateProjectionMatrix();
	renderer.setSize(w, h);
	controls.handleResize();
}

function update(dt) {
	resize();
	updateControlSpeed();
	camera.updateProjectionMatrix();

	controls.update(dt);
}

function updateControlSpeed() {
	camera.position.y = Math.max(camMinY, camera.position.y);
	controls.movementSpeed = 2 + camera.position.y * 2;
}

function render(dt) {
	if (animateCamera) {
		var camH = 2.5;
		var camSpeed = 20;
		var dur = Date.now() - animationStart;
		var dist = (dur / 1000.0) * camSpeed;
		var pathLength = animationPath.getLength();
		var lootAtM = (dist + 10) / pathLength;
		var m = (dist) / pathLength;
		if (lootAtM <= 1.0) {
			var camP = animationPath.getPoint(m);
			camP.y = camH;
			var lookAt = animationPath.getPoint(lootAtM);
			lookAt.y = camH;
			camera.position.copy(camP);
			camera.lookAt(lookAt);
		} else {
			animateCamera = false;
		}
	}
	renderer.render(scene, camera);
}

function animate(t) {
	requestAnimationFrame(animate);

	update(clock.getDelta());
	render(clock.getDelta());
}
