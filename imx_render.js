
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
// global for popup
var popup;
var pointLayers = makeGroup('Punt-Objecten');
var lineLayers = makeGroup('Lijn-Objecten');
var polygonLayers = makeGroup('Gebieden');
var baseLayers = makeGroup('Ondergrond');
var vectorLayers = new ol.layer.Group({
        title: 'IMX Objecten',
        layers: [
            polygonLayers,
            lineLayers,
            pointLayers
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
    ol.proj.proj4.register(proj4);
    var tile = new ol.layer.Tile({
            'title': 'Open Street Map',
            source: new ol.source.OSM()
        });
    baseLayers.getLayers().push(tile);
    map = new ol.WebGLMap({
            target: 'map',
            'title': 'Base map',
            layers: [baseLayers, vectorLayers],
            view: new ol.View({
                center: ol.proj.fromLonLat([5.3, 52.23]),
                zoom: 8
            })
        });
    //var selectInteraction = new ol.interaction.Select();
    //map.addInteraction(selectInteraction);
    popup = new ol.Overlay({
            element: document.getElementById('popup')
        });
    //map.addOverlay(popup);
    //map.on('singleclick', popupSingleClick);
	var select = new ol.interaction.Select(); 
	map.addInteraction(select);
          select.on('select', function(e) {
            var message = '&nbsp;' +
                e.target.getFeatures().getLength() +
                ' selected features (last operation selected ' + e.selected.length +
                ' and deselected ' + e.deselected.length + ' features)';
			console.log(message);
          });
}

function popupSingleClick(evt) {
    var element = $(popup.getElement());
    console.log(evt);
    var pixel = map.getPixelFromCoordinate(evt.coordinate);
    var features = [];
    map.forEachFeatureAtPixel(pixel, function (feature) {
        if (feature.get('imxType') && feature.get('geometry').getType() !== 'Polygon') {
            features.push(feature);
        }
    });
    if (features.length > 0) {
        var info = [];
        var i,
        ii;
        for (i = 0, ii = features.length; i < ii; ++i) {
            var f = features[i];
            info.push('puic: ' + f.get('id') + '<br/>');
            info.push(f.get('imxType') + ': ' + getIdent(f) + '<br/>');
            if (f.getGeometry().getLength) {
                info.push('length: ' + f.getGeometry().getLength().toFixed(2) + '<br/>');
            }

        }
        element.popover('destroy');
        element.popover({
            'placement': 'top',
            'html': true,
            'content': info
        });
        popup.setPosition(evt.coordinate);
        element.popover('show');
    } else {
        element.popover('destroy');
    }
}

function getIdent(feature) {
    var name = feature.get('name');
    if (name === undefined) {
        name = feature.get('id');
    }
    return name;
}
function loadDemoFile() {
    $.get('UitgifteEnschede_imx121_ref.xml', function (data) {
        parseAndRenderIMX(data, 'UitgifteEnschede_imx121_ref.xml');
    });
}

var viewTypes = new Object();
function setViewTypes() {
    viewTypes = new Object();
    var types = ['RailConnection', 'Track', 'Passage', 'SingleSwitch', 'DoubleDiamondSwitch', 'SingleDiamondSwitch', 'BufferStop'];
    $.each(types, function (index, type) {
        viewTypes[type] = type;
    });
}

function parseAndRenderIMX(xmlDoc, src) {
    setViewTypes();
    var geoms = xmlDoc.getElementsByTagName("GeographicLocation");
    var objectsWithGeom = [];
    $.each(geoms, function (index, geom) {
        objectsWithGeom.push(geom.parentNode.parentNode);
    });
    var isLargeDataset = objectsWithGeom.length > 10000;
    var typeMap = new Object();
    var i = 0;
    $(objectsWithGeom).each(function (index, objectWithGeom) {
        var nodeName = objectWithGeom.nodeName;
        if (viewTypes[nodeName] !== undefined) {
            var entry = typeMap[nodeName];
            if (entry == undefined) {
                var color = getColor(i++);
                entry = new Object({
                        color: color,
                        list: []
                    });
                typeMap[nodeName] = entry;
            }
            entry.list.push(objectWithGeom);
        }
    });
    buildTypeLayers(typeMap, isLargeDataset);
    //setTableTypeMap(typeMap);
    var railConnections = $(xmlDoc).find('RailConnection');
    if (!isLargeDataset) {
        //buildScene(typeMap, railConnections);
    }
    createTrackMap(typeMap.Track);
    createPassageMap(typeMap.Passage);
    buildRailConnectionLayer(railConnections);
    updateLayerSwitcher();
}

function buildRailConnectionLayer(railConnections) {
    var vectorLayer = new ol.layer.Vector({
            'title': 'RailConnection',
            style: styleFunction,
            source: new ol.source.Vector({}),
            declutter: true
        });
    $.each(railConnections, function (index, railConnection) {
        var $rc = $(railConnection);
        var points = buildRailConnectionVertices(railConnection);
        var line = new ol.geom.LineString(points);
        line.transform(ol.proj.get("EPSG:28992"), map.getView().getProjection());
        var puic = getPuic($rc);
        var feature = new ol.Feature({
                geometry: line,
                id: puic,
                name: $rc.attr('name'),
                label: $rc.attr('name'),
                imxType: 'RailConnection',
                text_color: 'rgb(255,0,0)',
                stroke_color: '#ffcc33'
            });
        feature.setId(puic);
        addAttributes(feature, railConnection);
        vectorLayer.getSource().addFeature(feature);
    });
    lineLayers.getLayers().push(vectorLayer);
	var snap = new ol.interaction.Snap({
        source: vectorLayer.getSource()
      });
      map.addInteraction(snap);
}

function buildTypeLayers(typeMap, isLargeDataset) {
    $.each(typeMap, function (type, entry) {
        var color = entry.color;
        var renderableObjects = entry.list;
        var location = $(renderableObjects[0]).find('GeographicLocation')[0];
        var geom = $(location).children()[0];

        var vectorLayer = new ol.layer.Vector({
                'title': type,
                style: styleFunction,
                source: new ol.source.Vector({}),
                declutter: true
            });
        if (geom.nodeName == 'gml:LineString') {
            createLineStringLayer(type, color, renderableObjects, vectorLayer);
        } else if (geom.nodeName == 'gml:Point') {
            vectorLayer.setVisible(!isLargeDataset);
            createPointLayer(type, color, renderableObjects, vectorLayer);
        } else if (geom.nodeName == 'gml:Polygon') {
            createPolygonLayer(type, color, renderableObjects, vectorLayer);
        } else if (geom.nodeName == 'gml:MultiPolygon') {
            createMultiPolygonLayer(type, color, renderableObjects, vectorLayer);
        } else if (geom.nodeName == 'gml:MultiLineString') {
            createMultiLineStringLayer(type, color, renderableObjects, vectorLayer);
        } else {
            //console.log('onbekend: ' + geom.tagName);
        }

    });
}

function getColor(index) {
    //var h = index * 50; // color hue between 1 and 360
    //var s = 70; // saturation 30-100%
    //var l = 40; // lightness 30-70%
    //var color = 'hsl(' + h + ',' + s + '%,' + l + '%)';
    //console.log('index: ' + index + ' - ' + color);
    var num = Math.round(0xaaaaaa * Math.random());
    var r = num >> 16;
    var g = num >> 8 & 255;
    var b = num & 255;
    return 'rgb(' + r + ', ' + g + ', ' + b + ')';

    return color;
}

function getPoslist($item) {
    var locations = $item.find('GeographicLocation');
    if (!locations) {
        return undefined;
    }
    var geom = $(locations[0]).children()[0];
    return $(geom).text().trim();
}

function getCoordinates(poslist) {
    var coordinates = [];
    var points = poslist.split(' ');
    for (var j = 0; j < points.length; j++) {
        var values = points[j].split(',')
            coordinates.push([values[0], values[1]]);
    }
    return coordinates;
}

function getPuic($item) {
    var puic = $item.attr('puic');
    if (puic == undefined) {
        puic = $item.attr('puicRef')
    }
    return puic;
}

function createPointLayer(title, color, items, vectorLayer) {
    $.each(items, function (index, item) {
        var $item = $(item);
        var poslist = getPoslist($item);
        if (poslist != undefined) {
            var point = new ol.geom.Point(getCoordinates(poslist)[0]);
            point.transform(ol.proj.get("EPSG:28992"), map.getView().getProjection());
            var puic = getPuic($item);
            var feature = new ol.Feature({
                    geometry: point,
                    id: puic,
                    name: $item.attr('name'),
                    label: $item.attr('name'),
                    imxType: title,
                    color: color
                });
            feature.setId(puic);
            addAttributes(feature, item);
            vectorLayer.getSource().addFeature(feature);
        } else {
            console.log('poslist undefined');
        }
    });
    pointLayers.getLayers().push(vectorLayer);
}

function addAttributes(feature, item) {
    $.each(item.attributes, function (name, value) {
        if (name !== 'name' && name !== 'puic') {
            feature[name] = value;
        }
    });
}

function createLineStringLayer(title, color, items, vectorLayer) {
    $.each(items, function (index, item) {
        var $item = $(item);
        var poslist = getPoslist($item);
        if (poslist != undefined) {
            var line = new ol.geom.LineString(getCoordinates(poslist));
            line.transform(ol.proj.get("EPSG:28992"), map.getView().getProjection());
            var puic = getPuic($item);
            var feature = new ol.Feature({
                    geometry: line,
                    id: puic,
                    name: $item.attr('name'),
                    label: $item.attr('name'),
                    imxType: title,
                    text_color: color,
                    stroke_color: color
                });
            feature.setId(puic);
            addAttributes(feature, item);
            vectorLayer.getSource().addFeature(feature);
        } else {
            console.log('poslist undefined');
        }
    });
    lineLayers.getLayers().push(vectorLayer);
}

function createPolygonLayer(title, color, items, vectorLayer) {
    //console.log('polygons: ' + title + ' itemCount: ' + items.length);
    $.each(items, function (index, item) {
        var $item = $(item);
        var poslist = getPoslist($item);
        if (poslist != undefined) {
            var poly = new ol.geom.Polygon([getCoordinates(poslist)]);
            poly.transform(ol.proj.get("EPSG:28992"), map.getView().getProjection());
            var puic = getPuic($item);
            var feature = new ol.Feature({
                    geometry: poly,
                    id: puic,
                    name: $item.attr('name'),
                    label: $item.attr('name'),
                    imxType: title,
                    text_color: color,
                    stroke_color: color
                });
            feature.setId(puic);
            addAttributes(feature, item);
            vectorLayer.getSource().addFeature(feature);
        } else {
            console.log('poslist undefined');
        }
    });
    polygonLayers.getLayers().push(vectorLayer);
}

function createMultiPolygonLayer(title, color, items, vectorLayer) {
    $.each(items, function (index, item) {
        var $item = $(item);
        var polys = $item.find('gml\\:Polygon');
        var polyGeoms = [];
        $.each(polys, function (index, poly) {
            var poslist = $(poly).text().trim();
            if (poslist != undefined) {
                polyGeoms.push(getCoordinates(poslist));
            }
        });
        var polygon = new ol.geom.MultiPolygon([polyGeoms]);
        polygon.transform(ol.proj.get("EPSG:28992"), map.getView().getProjection());
        var puic = getPuic($item);
        var feature = new ol.Feature({
                geometry: polygon,
                id: puic,
                name: $item.attr('name'),
                label: $item.attr('name'),
                imxType: title,
                text_color: color,
                stroke_color: color
            });
        feature.setId(puic);
        addAttributes(feature, item);
        vectorLayer.getSource().addFeature(feature);
    });
    polygonLayers.getLayers().push(vectorLayer);
}

function createMultiLineStringLayer(title, color, items, vectorLayer) {
    $.each(items, function (index, item) {
        var $item = $(item);
        var lines = $item.find('gml\\:LineString');
        var lineGeoms = [];
        $.each(lines, function (index, line) {
            var poslist = $(line).text().trim();
            if (poslist != undefined) {
                lineGeoms.push(getCoordinates(poslist));
            }
        });
        var multiLineString = new ol.geom.MultiLineString(lineGeoms);
        multiLineString.transform(ol.proj.get("EPSG:28992"), map.getView().getProjection());
        var puic = getPuic($item);
        var feature = new ol.Feature({
                geometry: multiLineString,
                id: puic,
                name: $item.attr('name'),
                label: $item.attr('name'),
                imxType: title,
                text_color: color,
                stroke_color: color
            });
        feature.setId(puic);
        addAttributes(feature, item);
        vectorLayer.getSource().addFeature(feature);
    });
    lineLayers.getLayers().push(vectorLayer);
}

var nsResolver = function (element) {
    return 'http://www.prorail.nl/IMSpoor';
};
var styleFunction = function (feature, resolution) {
    var ft = feature.getGeometry().getType();
    var styles = [];
    if (ft == 'Point') {
        var style = new ol.style.Style({
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
        styles.push(style);
    } else if (ft == 'Polygon' || ft == 'MultiPolygon') {
        var style = new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: feature.get('stroke_color'),
                    width: 1
                }),
                fill: new ol.style.Fill({
                    //color: feature.get('stroke_color').replace('hsl', 'hsla').replace(')', ',0.1)')
                    color: feature.get('stroke_color')
                }),
                text: new ol.style.Text({
                    text: feature.get('label'),
                    fill: new ol.style.Fill({
                        color: 'black'
                    }),
                    stroke: new ol.style.Stroke({
                        color: feature.get('stroke_color'),
                        width: 1
                    }),
                    offsetX: 0,
                    offsetY: 0,
                })
            });
        styles.push(style);
    } else if (ft == 'LineString' || ft == 'MultiLineString') {
        var style = new ol.style.Style({
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
        styles.push(style);
        var measure = 0.0;
        var rot_offset =  90.0 * Math.PI / 180.0;
        feature.getGeometry().forEachSegment(function (start, end) {
            var dx = end[0] - start[0];
            var dy = end[1] - start[1];
            measure = measure + Math.abs(dx) + Math.abs(dy);
            var rotation = Math.atan2(dy, dx);
            // arrows
            styles.push(new ol.style.Style({
                    geometry: new ol.geom.Point(end),
                    image: new ol.style.Icon({
                        src: 'textures/arrow.png',
                        anchor: [0.75, 0.5],
                        rotateWithView: true,
                        rotation: -rotation
                    }),
                    text: new ol.style.Text({
                        text: getLabelText(resolution,measure),
						font: 'Normal 16px Verdana',
                        fill: new ol.style.Fill({
                            color: feature.get('stroke_color')
                        }),
                        stroke: new ol.style.Stroke({
                            color: '#ffffff',
                            width: 1
                        }),
						textAlign: 'left',
						baseline: 'middle',
                        offsetX: 5,
                        offsetY: 0,
                        rotation: -(rotation + rot_offset)
                    })
                }));
        });
    } else {
        console.log('unknown style');
    }
    return styles;
}

function getLabelText(resolution,measure){
	if(resolution > 16){
		return '';
	}
	return 'm=' + measure.toFixed(1);
};
