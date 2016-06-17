function handleFileSelect(evt) {
	evt.stopPropagation();
	evt.preventDefault();

	var files = evt.dataTransfer.files; // FileList object.

	// files is a FileList of File objects. List some properties.
	var output = [];
	for (var i = 0, f; f = files[i]; i++) {
		var reader = new FileReader();
		reader.onload =
			(function (file) {
			var fileName = file.name;
			console.log('file: ' + fileName);
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

	}
}

function handleDragOver(evt) {
	evt.stopPropagation();
	evt.preventDefault();
	evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

function init() {
	// Setup the dnd listeners.
	var dropZone = document.getElementById('drop_zone');
	dropZone.addEventListener('dragover', handleDragOver, false);
	dropZone.addEventListener('drop', handleFileSelect, false);
	// setup projectie
	proj4.defs("EPSG:28992", "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.040,49.910,465.840,-0.40939,0.35971,-1.86849,4.0772");

	vector = new ol.layer.Vector({
			style : styleFunction,
			source : new ol.source.Vector({})
		});
	initMap();

}

function initMap() {
	var tile = new ol.layer.Tile({
			source : new ol.source.OSM()
		});
	map = new ol.Map({
			target : 'map',
			layers : [tile, vector],
			view : new ol.View({
				center : ol.proj.fromLonLat([5.3, 52.23]),
				zoom : 8
			})
		});
		/*
	$.get('/valburg.xml', function (data) {
		parseAndRenderIMX(data, 'valburg.xml');
	});
	*/
}

function parseAndRenderIMX(xmlDoc, src) {
	var objectsWithGeom = $(xmlDoc).find('Geometry').parent();
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
}

function buildTypeLayers(typeMap) {
	var i = 0;
	$.each(typeMap, function (type, renderableObjects) {
		var color = getColor(i++);
		makeLegendItem(type, color, renderableObjects.length);
		console.log(type + ' ' + renderableObjects.length + ' items');
		var geom = $(renderableObjects[0]).children('geometry').children()[0];
		if (geom.nodeName == 'gml:LineString') {
			createLineStringLayer(type,color,renderableObjects)
		}
		else if (geom.nodeName == 'gml:Point') {
			createPointLayer(type, color, renderableObjects);
		} else if (geom.nodeName == 'gml:Polygon') {}
		else {
			console.log('onbekend: ' + geom.tagName);
		}
	});
}

function getColor(index) {
	var h = index * 50; // color hue between 1 and 360
	var s = 70; // saturation 30-100%
	var l = 40; // lightness 30-70%
	var color = 'hsl(' + h + ',' + s + '%,' + l + '%)';
	console.log('index: ' + index + ' - ' + color);
	return color;
}

function createPointLayer(title, color, items) {
	$.each(items, function (index, item) {
		var $item = $(item);
		var poslist = $item.find('Geometry').text().trim();
		if (poslist != undefined) {
			var coordValues = poslist.replace(',', ' ').split(' ');
			var point = new ol.geom.Point([coordValues[0], coordValues[1]]);
			point.transform(ol.proj.get("EPSG:28992"), map.getView().getProjection());
			var feature = new ol.Feature({
					geometry : point,
					id : $item.attr('puic'),
					name : $item.attr('name'),
					label : $item.attr('name'),
					color : color
				});
			vector.getSource().addFeature(feature);
		}
	});
}

function createLineStringLayer(title, color, items) {
	$.each(items, function (index, item) {
		var $item = $(item);
		var poslist = $item.find('Geometry').text().trim();
		
		if (poslist != undefined) {
			var coordinates = [];
			var points = poslist.split(' ');
			for (var j = 0; j < points.length; j += 2) {
				coordinates.push([points[j], points[j+1]]);
			}
			var line = new ol.geom.LineString(coordinates);
			line.transform(ol.proj.get("EPSG:28992"), map.getView().getProjection());
			var feature = new ol.Feature({
					geometry : line,
					id : $item.attr('puic'),
					name : $item.attr('name'),
					label : $item.attr('name'),
					text_color : color,
					stroke_color : color
				});
			vector.getSource().addFeature(feature);
		}
	});
}

function makeLegendItem(key, color, size) {
	var legend = document.getElementById("legend");
	var item = $('<div>');
	var myDiv = $('<div>');
	myDiv.css({
		"backgroundColor" : color,
		"float" : "left",
		"marginRight" : "3px",
		"border" : "1 px solid #000000"
	}).width(15).height(15);
	item.append(myDiv);
	item.append($('<div>').text(key + ' (' + size + ')'));
	$(legend).append(item);

}

var nsResolver = function (element) {
	return 'http://www.prorail.nl/IMSpoor';
};
var image = new ol.style.Circle({
		radius : 4,
		fill : new ol.style.Fill({
			color : 'red'
		})
	});

var styleFunction = function (feature, resolution) {
	var ft = feature.getGeometry().getType();
	var style;
	if (ft == 'Point') {
		style = new ol.style.Style({
				image : new ol.style.Circle({
					radius : 4,
					fill : new ol.style.Fill({
						color :  feature.get('color')
					})
				}),
				text : new ol.style.Text({
					text : feature.get('label'),
					fill : new ol.style.Fill({
						color :  feature.get('color')
					}),
					offsetX : 0,
					offsetY : -10,
				})
			});
	} else if (ft == 'Polygon') {
		style = new ol.style.Style({
				stroke : new ol.style.Stroke({
					color : 'green',
					width : 4
				}),
				fill : new ol.style.Fill({
					color : 'rgba(0, 255, 0, 0.3)'
				}),
				text : new ol.style.Text({
					text : feature.get('label'),
					fill : new ol.style.Fill({
						color : 'black'
					}),
					stroke : new ol.style.Stroke({
						color : 'black',
						width : 1
					}),
					offsetX : 0,
					offsetY : 0,
				})
			});
	} else if (ft == 'LineString') {
		style = new ol.style.Style({
				stroke : new ol.style.Stroke({
					color : feature.get('stroke_color'),
					width : 4
				}),
				text : new ol.style.Text({
					text : feature.get('label'),
					fill : new ol.style.Fill({
						color : feature.get('text_color')
					}),
					stroke : new ol.style.Stroke({
						color : feature.get('text_color'),
						width : 1
					}),
					offsetX : 0,
					offsetY : -5,
				})
			});
	} else {
		console.log('unknown style');
	}
	return [style];
};
