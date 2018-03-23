function handleFiles(files) {
	loadXml(files[0]);
}

function loadXml(file) {
	initGlobals();
	var fileSize = file.size;
	var chunkSize = 1024 * 1024 * 10; // bytes
	var offset = 0;
	var self = this; // we need a reference to the current object
	var chunkReaderBlock = null;
	var block = 0;
	var parser = sax.parser(false, {
			trim: true
		});
	configParser(parser);
	//console.log(parser);

	var readEventHandler = function (evt) {
		if (evt.target.error == null) {
			offset += evt.target.result.length;
			block++;
			console.log(block + ' ' + renderableObjects + ' ' + tagBuffer.length);
			callback(evt.target.result, parser); // callback for handling read chunk
		} else {
			console.log("Read error: " + evt.target.error);
			return;
		}
		if (offset >= fileSize) {
			report();
			return;
		}

		// of to the next chunk
		chunkReaderBlock(offset, chunkSize, file);
	}

	chunkReaderBlock = function (_offset, length, _file) {
		var r = new FileReader();
		var blob = _file.slice(_offset, length + _offset);
		r.onload = readEventHandler;
		r.readAsText(blob);
	}

	// now let's start the read with the first block
	chunkReaderBlock(offset, chunkSize, file);
	
}

function report() {
	console.log("Done reading file");
	var duration = new Date().getTime() - startTime;
	console.log("Duration: " + duration);
	console.log('renderableObjects: ' + renderableObjects);
	console.log('renderableObjects: 324135');
	console.log('typeLayers: ' + typeLayers.types.length);
	for (var i = 0; i < typeLayers.types.length; ++i) {
		var type = typeLayers.types[i];
		console.log(type + ': ' + typeLayers[type].length + ' items');
	}
	//console.log(JSON.stringify(geojson));
}

function initGlobals() {
	geojson = {
		type: "FeatureCollection",
		features: []
	};
	renderableObjects = 0;
	tagBuffer = [];
	closingTagName = null;
	typeLayers = {};
	typeLayers.types = [];
	startTime = new Date().getTime();
}

var renderableObjects;
var startTime;
var tagBuffer;
var closingTagName;
var typeLayers;

function callback(chunkText, parser) {
	parser.write(chunkText);
}

function configParser(parser) {

	parser['onopentag'] = function (tag) {
		//console.log(tag.name);
		tagBuffer.push(tag);
		if (tag.name === 'GEOGRAPHICLOCATION') {
			var index = tagBuffer.length - 3;
			tagBuffer = tagBuffer.slice(index);
			closingTagName = tagBuffer[0].name;
			renderableObjects++;
		}
		if (tagBuffer.length > 1000) {
			tagBuffer = [];
		}
	};
	parser['ontext'] = function (text) {
		tagBuffer.push(text);
	};
	parser['onclosetag'] = function (tag) {
		tagBuffer.push(tag);
		if (tag === closingTagName) {
			//buildGMLObject(tagBuffer);
			buildGeoJsonFeature(tagBuffer);
			tagBuffer = [];
			closingTagName = null;
		}
	};
}

function buildGMLObject(tagBuffer) {
	var type = tagBuffer[0].name;
	console.log('build: ' + type);
	var geomType;
	var coords = '';
	for (var i = 0; i < tagBuffer.length; i++) {
		var tagName = tagBuffer[i].name;
		if (tagName && tagName.startsWith('GML')) {
			if (tagName === 'GML:COORDINATES') {
				coords = tagBuffer[i + 1];
			} else if (geomType == undefined) {
				geomType = tagName;
			}

		} else if (tagBuffer[i] === 'GEOGRAPHICLOCATION') {
			break;
		}
	}
	if (geomType && coords.length > 0) {
		console.log('adding: ' + geomType + '  -> coords:' + coords.length);
		addToLayer(type, {
			geomType,
			coords
		});
	}
	//var coordValues = poslist.replace(',', ' ').split(' ');

	//console.log('build: ['+renderableObjects +'] ' + tagBuffer[0].name);
}

function buildGeoJsonFeature(tagBuffer) {
	var type = tagBuffer[0].name;
	var puic = tagBuffer[0].puic;
	var f = {
		type: 'Feature',
		id: puic,
		properties: {
			type: type
		},
		geometry: makeGJGeom(tagBuffer)
		
	};
	geojson.features.push(f);
}

function makeGJGeom(tagBuffer) {
	var geomType;
	var coords=[];
	for (var i = 0; i < tagBuffer.length; i++) {
		var tagName = tagBuffer[i].name;
		if (tagName && tagName.startsWith('GML')) {
			if (tagName === 'GML:COORDINATES') {
				coords.push(tagBuffer[i + 1]);
			} else if (geomType == undefined) {
				geomType = tagName;
			}

		} else if (tagBuffer[i] === 'GEOGRAPHICLOCATION') {
			break;
		}
	}
	if (geomType && coords.length > 0) {
		console.log('adding: ' + geomType + '  -> coords:' + coords.length);
		return {
			type: toGJType(geomType),
			coordinates: toGJCoords(coords)
		};
	}
	return undefined;
}

function toGJCoords(coordStrings){
	if(coordStrings.length == 1){
		return toCoordArray(coordStrings[0]);
	}
	else{
		var coordArray = [];
		$.each(coordStrings, function (index, coordString) {
			coordArray.push(toCoordArray(coordString));
		});
		return coordArray;
	}
}

function toCoordArray(coordString){
	var coordArray = [];
	var vertexStrings = coordString.split(' ');
	$.each(vertexStrings, function (index, vertexString) {
		var vertexValues = vertexString.split(',');
		var point = [];
		$.each(vertexValues, function (index, vertexValue) {
			point.push(parseFloat(vertexValue));
		});
		coordArray.push(point);
	});
	return coordArray;
}

function toGJType(type){
	if('GML:POINT' == type){
		return 'Point';
	}
	else if('GML:LINESTRING' == type){
		return 'LineString';
	}
	else if('GML:POLYGON' == type){
		return 'Polygon';
	}
	return type;
}

function addToLayer(type, item) {
	var layer = typeLayers[type];
	if (layer === undefined) {
		layer = [];
		typeLayers[type] = layer;
		typeLayers.types.push(type);
	}
	layer.push(item);
}
