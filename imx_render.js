function handleFileSelect(evt) {
	evt.stopPropagation();
	evt.preventDefault();

	var files = evt.dataTransfer.files; // FileList object.

	// files is a FileList of File objects. List some properties.
	var output = [];
	$.each(files, function (index, f) {
		var reader = new FileReader();
		reader.onload =
			(function (file) {
			var fileName = file.name;
			console.log('file hallo: ' + fileName);
			return function (event) {
				var text = event.target.result;
				var src = fileName;
				var parser = new DOMParser();
				var xmlDoc = parser.parseFromString(text, "text/xml");
				parseAndRenderIMX(xmlDoc, src);
			};
		})(f);
		reader.onerror = function (event) {
			console.log('file-error: ' + event.target.error.code);
		};
		reader.readAsText(f);
	});
}

function handleDragOver(evt) {
	evt.stopPropagation();
	evt.preventDefault();
	evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

function initDragAndDrop() {
	// Setup the dnd listeners.
	var dropZone = document.getElementById('map');
	dropZone.addEventListener('dragover', handleDragOver, false);
	dropZone.addEventListener('drop', handleFileSelect, false);
	// setup projectie
}
var pointLayers = makeGroup('Punt-Objecten');
var lineLayers = makeGroup('Lijn-Objecten');
var polygonLayers = makeGroup('Gebieden');
var baseLayers = makeGroup('Ondergrond');
var overlayGroup = new ol.layer.Group({
		title: 'IMX Objecten',
		layers: [
			baseLayers,
			polygonLayers,
			lineLayers,
			pointLayers,

		]
	});

function makeGroup(title) {
	var group = new ol.layer.Group({
			title: title,
			layers: [
			]
		});
	return group;
}

function initMap() {
	console.log('initMap');
	proj4.defs("EPSG:28992", "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.040,49.910,465.840,-0.40939,0.35971,-1.86849,4.0772");
	var tile = new ol.layer.Tile({
			'title': 'Open Street Map',
			source: new ol.source.OSM()
		});
	baseLayers.getLayers().push(tile);
	map = new ol.Map({
			target: 'map',
			'title': 'Base map',
			layers: [overlayGroup],
			view: new ol.View({
				center: ol.proj.fromLonLat([5.3, 52.23]),
				zoom: 8
			})
		});
}

function loadDemoFile() {
	$.get('/file.xml', function (data) {
		parseAndRenderIMX(data, 'file.xml');
	});
}

function parseAndRenderIMX(xmlDoc, src) {
	var objectsWithGeom = $(xmlDoc).find('Geometry').parent();
	if (objectsWithGeom.length == 0) {
		objectsWithGeom = $(xmlDoc).find('GeographicLocation').parent().parent();
	}
	var typeMap = new Object();

	objectsWithGeom.each(function (index, objectWithGeom) {
		var nodeName = objectWithGeom.nodeName;
		var list = typeMap[nodeName];
		if (list == undefined) {
			list = [];
			typeMap[nodeName] = list;
		}
		list.push(objectWithGeom);
	});
	buildTypeLayers(typeMap);
	buildDataTables(typeMap);
	updateLayerSwitcher();
}

function buildTypeLayers(typeMap) {
	var i = 0;
	$.each(typeMap, function (type, renderableObjects) {
		var color = getColor(i++);
		makeLegendItem(type, color, renderableObjects.length);
		//console.log(type + ' ' + renderableObjects.length + ' items');
		var location = $(renderableObjects[0]).find('GeographicLocation')[0];
		var geom = location.children[0];
		var vectorLayer = new ol.layer.Vector({
				'title': type,
				style: styleFunction,
				source: new ol.source.Vector({})
			});
		if (geom.nodeName == 'gml:LineString') {
			createLineStringLayer(type, color, renderableObjects, vectorLayer)
		} else if (geom.nodeName == 'gml:Point') {
			createPointLayer(type, color, renderableObjects, vectorLayer);
		} else if (geom.nodeName == 'gml:Polygon') {
			createPolygonLayer(type, color, renderableObjects, vectorLayer);
		} else if (geom.nodeName == 'gml:MultiPolygon') {
			createMultiPolygonLayer(type, color, renderableObjects, vectorLayer);
		} else {
			//console.log('onbekend: ' + geom.tagName);
		}

	});
}

function getColor(index) {
	var h = index * 50; // color hue between 1 and 360
	var s = 70; // saturation 30-100%
	var l = 40; // lightness 30-70%
	var color = 'hsl(' + h + ',' + s + '%,' + l + '%)';
	//console.log('index: ' + index + ' - ' + color);
	return color;
}

function createPointLayer(title, color, items, vectorLayer) {
	$.each(items, function (index, item) {
		var $item = $(item);
		var poslist = $item.find('GeographicLocation').text().trim();
		if (poslist != undefined) {
			var coordValues = poslist.replace(',', ' ').split(' ');
			var point = new ol.geom.Point([coordValues[0], coordValues[1]]);
			point.transform(ol.proj.get("EPSG:28992"), map.getView().getProjection());
			var feature = new ol.Feature({
					geometry: point,
					id: $item.attr('puic'),
					name: $item.attr('name'),
					label: $item.attr('name'),
					color: color
				});
			vectorLayer.getSource().addFeature(feature);
		}
	});
	pointLayers.getLayers().push(vectorLayer);
}

function createLineStringLayer(title, color, items, vectorLayer) {
	$.each(items, function (index, item) {
		var $item = $(item);
		var poslist = $item.find('GeographicLocation').text().trim();

		if (poslist != undefined) {
			var coordinates = [];
			var points = poslist.split(' ');
			for (var j = 0; j < points.length; j++) {
				var values = points[j].split(',')
					coordinates.push([values[0], values[1]]);
			}
			var line = new ol.geom.LineString(coordinates);
			line.transform(ol.proj.get("EPSG:28992"), map.getView().getProjection());
			var feature = new ol.Feature({
					geometry: line,
					id: $item.attr('puic'),
					name: $item.attr('name'),
					label: $item.attr('name'),
					text_color: color,
					stroke_color: color
				});
			vectorLayer.getSource().addFeature(feature);
		}
	});
	lineLayers.getLayers().push(vectorLayer);
}

function createPolygonLayer(title, color, items, vectorLayer) {
	//console.log('polygons: ' + title + ' itemCount: ' + items.length);
	$.each(items, function (index, item) {
		var $item = $(item);
		var poslist = $item.find('GeographicLocation').text().trim();
		if (poslist != undefined) {
			var coordinates = [];
			var points = poslist.split(' ');
			for (var j = 0; j < points.length; j++) {
				var values = points[j].split(',');
				coordinates.push([values[0], values[1]]);
			}
			var poly = new ol.geom.Polygon([coordinates]);
			poly.transform(ol.proj.get("EPSG:28992"), map.getView().getProjection());
			var feature = new ol.Feature({
					geometry: poly,
					id: $item.attr('puic'),
					name: $item.attr('name'),
					label: $item.attr('name'),
					text_color: color,
					stroke_color: color
				});
			vectorLayer.getSource().addFeature(feature);
		}
	});
	polygonLayers.getLayers().push(vectorLayer);
}

function createMultiPolygonLayer(title, color, items, vectorLayer) {
	//console.log('multipolygons: ' + title + ' itemCount: ' + items.length);
	$.each(items, function (index, item) {
		var $item = $(item);
		var polys = $item.find('Polygon');
		$.each(polys, function (index, poly) {
			var poslist = $(poly).text().trim();
			if (poslist != undefined) {
				var coordinates = [];
				var points = poslist.split(' ');
				for (var j = 0; j < points.length; j++) {
					var values = points[j].split(',');
					coordinates.push([values[0], values[1]]);
				}
				var polygon = new ol.geom.Polygon([coordinates]);
				polygon.transform(ol.proj.get("EPSG:28992"), map.getView().getProjection());
				var feature = new ol.Feature({
						geometry: polygon,
						id: $item.attr('puic'),
						name: $item.attr('name'),
						label: $item.attr('name'),
						text_color: color,
						stroke_color: color
					});
				vectorLayer.getSource().addFeature(feature);
			}
		})
	});
	polygonLayers.getLayers().push(vectorLayer);
}

function makeLegendItem(key, color, size) {
	var legend = document.getElementById("legend");
	var item = $('<div>');
	var myDiv = $('<div>');
	myDiv.css({
		"backgroundColor": color,
		"float": "left",
		"marginRight": "3px",
		"border": "1 px solid #000000"
	}).width(15).height(15);
	item.append(myDiv);
	item.append($('<div>').text(key + ' (' + size + ')'));
	$(legend).append(item);

}

var nsResolver = function (element) {
	return 'http://www.prorail.nl/IMSpoor';
};

var styleFunction = function (feature, resolution) {
	var ft = feature.getGeometry().getType();
	var style;
	if (ft == 'Point') {
		style = new ol.style.Style({
				image: new ol.style.Circle({
					radius: 4,
					fill: new ol.style.Fill({
						color: feature.get('color')
					})
				}),
				text: new ol.style.Text({
					text: feature.get('label'),
					fill: new ol.style.Fill({
						color: feature.get('color')
					}),
					offsetX: 0,
					offsetY: -10,
				})
			});
	} else if (ft == 'Polygon') {
		style = new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: feature.get('stroke_color'),
					width: 1
				}),
				fill: new ol.style.Fill({
					color: feature.get('stroke_color').replace('hsl', 'hsla').replace(')', ',0.1)')
				}),
				text: new ol.style.Text({
					text: feature.get('label'),
					fill: new ol.style.Fill({
						color: feature.get('stroke_color')
					}),
					stroke: new ol.style.Stroke({
						color: feature.get('stroke_color'),
						width: 1
					}),
					offsetX: 0,
					offsetY: 0,
				})
			});
	} else if (ft == 'LineString') {
		style = new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: feature.get('stroke_color'),
					width: 2
				}),
				text: new ol.style.Text({
					text: feature.get('label'),
					fill: new ol.style.Fill({
						color: feature.get('text_color')
					}),
					stroke: new ol.style.Stroke({
						color: feature.get('text_color'),
						width: 1
					}),
					offsetX: 0,
					offsetY: -5,
				})
			});
	} else {
		console.log('unknown style');
	}
	return [style];
};
