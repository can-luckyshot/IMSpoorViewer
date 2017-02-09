var camera, scene, renderer;
var effect, controls;
var element, container;
var extent;
var offset;
var world_size = [];
var camMinY = 0.005;
var trackPaths = [];
// animation vars
var animateCamera = false;
var animationStart;
var animationPath;
var TTW = 2.915; //track texture width
var TTL = TTW * 2.0; //track texture length
var loader;
	

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
			depthWrite: false
		});
	var step = 80.0;
	var w = (world_size[0] - (world_size[0] % step)) + step;
	var h = (world_size[1] - (world_size[1] % step)) + step;
	var repeatS = (w / step);
	var repeatT = (h / step);
	console.log('repeat: ' + repeatS + ',' + repeatT);
	texture.repeat = new THREE.Vector2(repeatS, repeatT);
	var geometry = new THREE.PlaneBufferGeometry(w, h, repeatS, repeatT);

	var mesh = new THREE.Mesh(geometry, material);
	mesh.rotation.x = -Math.PI / 2;
	scene.add(mesh);
}

function buildScene(typeMap) {
	calcExtent(typeMap);
	console.log('Extent: ' + extent);
	initPlane();
	createTracks(typeMap.Track.list);
	fillTracklist();
	createSignals(typeMap.Signal.list);
}

function fillTracklist() {
	var list = $('#tracklist');
	$.each(trackPaths, function (index, track) {
		//console.log('add track: ' + track.name);
		var item = $('<li></li>');
		var content = $('<a></a>').text(track.name);
		content.on('click', function () {
			flyoverTrack(track.puic);
		});
		var pl = ''+track.path.getLength();
		pl = pl.split('.')[0];
		var badge = $('<span></span>').text(''+pl+'m').addClass('badge pull-right');
		badge.css({"backgroundColor": '#428bca'});
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

function createTracks(renderableObjects) {
	$.each(renderableObjects, function (index, item) {
		var $item = $(item);
		var puic = $item.attr('puicRef');
		var trackName = $item.attr('name');
		var points = getGmlCoords(item);
		var path = buildPath(points, index);
		trackPaths.push({
			puic: puic,
			path: path,
			name: trackName
		});
		var mesh = buildTrackMesh(path, points.length,index);
		mesh.renderDepth = index;
		scene.add(mesh);
		if (index == 0 && false) {
			var P = path.getPointAt(0);
			camera.position.set(P.x, 10.0, P.z);
			console.log('set camera to first track position: ' + P.x + ',' + P.z);
			//buildSignal(path,index);
		}
	});
}

function createSignals(renderableObjects) {
	var material = new THREE.MeshPhongMaterial({
			color: 0xc0c0c0
		});
	var jsonloader = new THREE.JSONLoader();
	jsonloader.load('models/signal.json', function (geometry) {
		geometry.computeBoundingBox();
		var signalScale = 6.045 / geometry.boundingBox.max.y;
		$.each(renderableObjects, function (index, item) {
			var mesh = new THREE.Mesh(geometry, material);
			var point = getGmlCoords(item)[0];
			var $item = $(item);
			var tri = $item.find('TrackRelationInfo');
			var direction = tri.attr('direction');
			var trackRef = tri.attr('trackRef');
			var measure = parseFloat(tri.attr('atMeasure'));
			var path = getPathByPuic(trackRef);
			//console.log('path length: '+path.getLength()+' measure: '+measure + ' t='+measure/path.getLength());
			var tan = path.getTangentAt(measure / path.getLength());
			var angle = Math.PI * 1.5 + Math.atan2(tan.x, tan.z);
			if (direction === 'Upstream') {
				angle += Math.PI;
			}
			mesh.rotation.set(0.0, angle, 0.0);
			var x =  - (point[0] - offset[0]);
			var y = point[1] - offset[1];
			mesh.position.set(x, 0.0, y);
			mesh.scale.set(signalScale, signalScale, signalScale);
			scene.add(mesh);
			if (index == 0) {
				camera.position.set(x, 10.0, y);
				console.log('set camera to first track position: ' + x + ',' + y);
			}
		});
	});
}

function getPathByPuic(puic) {
	for (var i = 0; i < trackPaths.length; i++) {
		if (trackPaths[i].puic === puic) {
			return trackPaths[i].path;
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
	var divisions = Math.round(tempPath.getLength()/TTL);
	newPoints2d = tempPath.getSpacedPoints(divisions);
	var newPoints3d = [];
	$.each(newPoints2d, function (index, p) {
		newPoints3d.push(new THREE.Vector3(p.x,0.0, p.y));
	});
	return new THREE.CatmullRomCurve3(newPoints3d);	                 
}

function buildTrackMesh(path, segmentCount,count) {
	var singleGeometry = new THREE.Geometry();
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
			polygonOffsetFactor: count, // positive value pushes polygon further away
			polygonOffsetUnits: 1
			//wireframe: true
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
		var camH = 3.0;
		var camSpeed = 15;
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
