		var map,vector;
		var image = new ol.style.Circle({
			radius: 4,
			stroke: new ol.style.Stroke({color: 'red', width: 5})
		});
				
		var styleFunction = function(feature, resolution) {
			var ft = feature.getGeometry().getType();
			var style;
			console.log('style: '+ft);
			if(ft == 'Point'){
				style = new ol.style.Style({
					image: image,
					text: new ol.style.Text({
						text: feature.get('label'),
						fill: new ol.style.Fill({color: 'red'}),
						stroke: new ol.style.Stroke({color: 'red', width: 1}),
						offsetX: 0,
						offsetY: -10,
					}) 
				});
			}
			else if(ft == 'Polygon'){
				style = new ol.style.Style({
					stroke: new ol.style.Stroke({
					  color: 'green',
					  width: 4
					}),
					fill: new ol.style.Fill({
						color: 'rgba(0, 255, 0, 0.3)'
					}),
					text: new ol.style.Text({
						text: feature.get('label'),
						fill: new ol.style.Fill({color: 'black'}),
						stroke: new ol.style.Stroke({color: 'black', width: 1}),
						offsetX: 0,
						offsetY: 0,
					})
				});
			}
			else if(ft == 'LineString'){
				var stroke_color = 'blue';
				if(feature.get('stroke_color') != undefined){
					stroke_color = feature.get('stroke_color');
				}
				var text_color = 'blue';
				if(feature.get('text_color') != undefined){
					text_color = feature.get('text_color');
				}
				style = new ol.style.Style({
					stroke: new ol.style.Stroke({
					  color: stroke_color,
					  width: 4
					}),
					text: new ol.style.Text({
						text: feature.get('label'),
						fill: new ol.style.Fill({color: text_color}),
						stroke: new ol.style.Stroke({color: text_color, width: 1}),
						offsetX: 0,
						offsetY: -5,
					})
				});
			}
			else{
				console.log('unknown style');
			}
			return [style];
		};
		
		function handleFileSelect(evt) {
			evt.stopPropagation();
			evt.preventDefault();

			var files = evt.dataTransfer.files; // FileList object.

			// files is a FileList of File objects. List some properties.
			var output = [];
			for (var i = 0, f; f = files[i]; i++) {
			   var reader = new FileReader();
			   reader.onload = 
					function(event){
						var text = event.target.result;
						parseAndRenderIMX(text);
					};
			   reader.onerror = function(event){
					console.log('file-error: '+event.target.error.code);
			   };
			   reader.readAsText(f);
			   
			}
		}
		
		function parseAndRenderIMX(text){
			var parser = new DOMParser();
			var xmlDoc = parser.parseFromString(text,"text/xml");
			procesTracks(xmlDoc);
			procesJunctions(xmlDoc);
			procesPassages(xmlDoc);
			procesSignals(xmlDoc);
			procesGeoSubcodeArea(xmlDoc);
			procesKilometerRibbons(xmlDoc);
			fillLegend(xmlDoc);
			map.render();
			
		}
		
		function zoomToIMX(){
			var options = {
				padding: [10, 10, 10, 10],
				constrainResolution: false
			}
			var extent = vector.getSource().getExtent();
			console.log('extent: ' + JSON.stringify(extent));
			map.getView().fit(extent,map.getSize(),options);
		}
		
		var nsResolver = function(element){
			return 'http://www.prorail.nl/IMSpoor';
		};
		
		function fillLegend(xmlDoc){
			var id = 0;
			listItem(id++,'Knopen: ', xpathCount(xmlDoc,'//ims:Node'));
			listItem(id++,'Takken: ', xpathCount(xmlDoc,'//ims:Edge'));
			listItem(id++,'Wissels: ',xpathCount(xmlDoc,"//ims:Junction[@junctionType='singleSwitch']"));
			listItem(id++,'Stootjukken: ',xpathCount(xmlDoc,"//ims:Junction[@junctionType='bufferStop']"));
			listItem(id++,'Engelse Wissels: ',xpathCount(xmlDoc,"//ims:Junction[@junctionType='fullSlipCrossing']"));
			listItem(id++,'Half Engelse Wissels: ',xpathCount(xmlDoc,"//ims:Junction[@junctionType='singleSlipCrossing']"));
			listItem(id++,'Kruizen: ',xpathCount(xmlDoc,"//ims:Junction[@junctionType='crossing']"));
			listItem(id++,'Seinen: ',xpathCount(xmlDoc,"//ims:Signal"));
			listItem(id++,'Secties: ',xpathCount(xmlDoc,"//ims:SectionDemarcation"));
			listItem(id++,'Geocode subgebieden: ',xpathCount(xmlDoc,"//ims:GeoSubcodeArea"));
			listItem(id++,'Kilometerlinten: ',xpathCount(xmlDoc,"//ims:KilometerRibbon"));
		}
		
		function listItem(id, label, value){
			var listItem = document.getElementById("legend_"+id);
			if(listItem == undefined){
				var legend = document.getElementById("legend");
				listItem = document.createElement('p');
				listItem.setAttribute('id', "legend_"+id);
				legend.appendChild(listItem);
				listItem.innerHTML = label+value;
			}
			else if(value > 0){
				listItem.innerHTML = label+value;
			}
		}		
		
		function xpathCount(xmlDoc,expression){
			var result = xmlDoc.evaluate('count('+expression+')', xmlDoc, nsResolver, XPathResult.ANY_TYPE,null);
			return result.numberValue;
		}
		
		function count(xmlDoc,nodeName,attibute,type){
			var count = 0;
			var nodes = xmlDoc.getElementsByTagName(nodeName);
			if(nodes){
				for(var i=0;i<nodes.length;i++){
					if(nodes[i].attributes[attibute].value == type){
						count++;
					}
				}
			}
			return count;
		}
		
		function procesJunctions(xmlDoc){
			var junctions = xmlDoc.evaluate('//ims:Junction', xmlDoc, nsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null);
			for ( var i=0 ; i < junctions.snapshotLength; i++ ){
				var junction = junctions.snapshotItem(i);
				var poslist = junction.getElementsByTagName("pos")[0].childNodes[0];
				if(poslist != undefined){
					var coordValues = poslist.nodeValue.split(' ');
					var point = new ol.geom.Point([coordValues[0],coordValues[1]]);
					point.transform(ol.proj.get("EPSG:28992"),map.getView().getProjection());
					var feature = new ol.Feature({
					  geometry: point,
					  id: junction.attributes['nodeRef'].value,
					  name: junction.attributes['name'].value,
					  label: junction.attributes['name'].value,
					  type: junction.attributes['junctionType'].value,
					});
					vector.getSource().addFeature(feature);
				}
			}
		}
		
		function procesSignals(xmlDoc){
			var signals = xmlDoc.evaluate('//ims:Signal', xmlDoc, nsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null);
			for ( var i=0 ; i < signals.snapshotLength; i++ ){
				var signal = signals.snapshotItem(i);
				var poslist = signal.getElementsByTagName("pos")[0].childNodes[0];
				if(poslist != undefined){
					var coordValues = poslist.nodeValue.split(' ');
					var point = new ol.geom.Point([coordValues[0],coordValues[1]]);
					point.transform(ol.proj.get("EPSG:28992"),map.getView().getProjection());
					var feature = new ol.Feature({
					  geometry: point,
					  id: signal.attributes['puic'].value,
					  name: signal.attributes['name'].value,
					  label: signal.attributes['name'].value,
					  type: signal.attributes['signalType'].value,
					});
					vector.getSource().addFeature(feature);
				}
			}
		}
		
		function procesPassages(xmlDoc){
			var passages = xmlDoc.evaluate('//ims:Passage', xmlDoc, nsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null);
			for ( var i=0 ; i < passages.snapshotLength; i++ ){
				var passage = passages.snapshotItem(i);
				console.log('Passage: '+passage.attributes['jumperRef'].value);
				var poslist = undefined;
				if(passage.getElementsByTagName("posList").length > 0){
					poslist = passage.getElementsByTagName("posList")[0].childNodes[0];
					console.log('posList: '+poslist.nodeValue);
				}
				if(poslist != undefined){
					console.log('adding');
					var coordinates = [];
					var coordValues = poslist.nodeValue.split(' ');
					for(var j=0;j<coordValues.length;j+=2){
						coordinates.push([coordValues[j],coordValues[j+1]]);
					}
					var line = new ol.geom.LineString(coordinates);
					line.transform(ol.proj.get("EPSG:28992"),map.getView().getProjection());
					var feature = new ol.Feature({
					  geometry: line,
					  text_color: 'red',
					  stroke_color: 'red',
					  id: passage.attributes['jumperRef'].value,
					  name: passage.attributes['name'].value,
					  label: passage.attributes['name'].value
					});
					vector.getSource().addFeature(feature);
				}
			}
		}
		
		function procesTracks(xmlDoc){
			var tracks = xmlDoc.evaluate('//ims:Track', xmlDoc, nsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null);
			for ( var i=0 ; i < tracks.snapshotLength; i++ ){
				var track = tracks.snapshotItem(i);
				var poslist = track.getElementsByTagName("posList")[0].childNodes[0];
				if(poslist != undefined){
					var coordinates = [];
					var coordValues = poslist.nodeValue.split(' ');
					for(var j=0;j<coordValues.length;j+=2){
						coordinates.push([coordValues[j],coordValues[j+1]]);
					}
					var line = new ol.geom.LineString(coordinates);
					line.transform(ol.proj.get("EPSG:28992"),map.getView().getProjection());
					var feature = new ol.Feature({
					  geometry: line,
					  id: track.attributes['edgeRef'].value,
					  name: track.attributes['name'].value,
					  label: track.attributes['name'].value
					});
					vector.getSource().addFeature(feature);
				}
			}
		}
		
		function procesKilometerRibbons(xmlDoc){
			var ribbons = xmlDoc.evaluate('//ims:KilometerRibbon', xmlDoc, nsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null);
			for ( var i=0 ; i < ribbons.snapshotLength; i++ ){
				var ribbon = ribbons.snapshotItem(i);
				var poslist = ribbon.getElementsByTagName("posList")[0].childNodes[0];
				if(poslist != undefined){
					var coordinates = [];
					var coordValues = poslist.nodeValue.split(' ');
					for(var j=0;j<coordValues.length;j+=2){
						coordinates.push([coordValues[j],coordValues[j+1]]);
					}
					var line = new ol.geom.LineString(coordinates);
					line.transform(ol.proj.get("EPSG:28992"),map.getView().getProjection());
					var feature = new ol.Feature({
					  geometry: line,
					  text_color: 'black',
					  stroke_color: 'black',
					  id: ribbon.attributes['puic'].value,
					  name: ribbon.attributes['name'].value,
					  label: ribbon.attributes['name'].value
					});
					vector.getSource().addFeature(feature);
				}
			}
		}
		
		function procesGeoSubcodeArea(xmlDoc){
			var areas = xmlDoc.evaluate('//ims:GeoSubcodeArea', xmlDoc, nsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null);
			for ( var i=0 ; i < areas.snapshotLength; i++ ){
				var area = areas.snapshotItem(i);
				var exterior = area.getElementsByTagName("exterior")[0];
				var poslist = exterior.getElementsByTagName("posList")[0].childNodes[0];
				if(poslist != undefined){
					var coordinates = [];
					var coordValues = poslist.nodeValue.split(' ');
					for(var j=0;j<coordValues.length;j+=2){
						coordinates.push([coordValues[j],coordValues[j+1]]);
					}
					console.log('aantal coords: '+coordinates.length);
					var coordList = [];
					coordList.push(coordinates);
					var poly = new ol.geom.Polygon(coordList);
					poly.transform(ol.proj.get("EPSG:28992"),map.getView().getProjection());
					var feature = new ol.Feature({
					  geometry: poly,
					  id: area.attributes['puic'].value,
					  name: area.attributes['name'].value,
					  label: area.attributes['name'].value
					});
					vector.getSource().addFeature(feature);
				}
				else{
					console.log('GeoSubcodeArea: geen postList');
				}
			}
		}

		function handleDragOver(evt) {
			evt.stopPropagation();
			evt.preventDefault();
			evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
		}
		
		function init(){
			// Setup the dnd listeners.
			var dropZone = document.getElementById('drop_zone');
			dropZone.addEventListener('dragover', handleDragOver, false);
			dropZone.addEventListener('drop', handleFileSelect, false);	
			// setup projectie
			proj4.defs("EPSG:28992", "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.040,49.910,465.840,-0.40939,0.35971,-1.86849,4.0772");
			
			vector = new ol.layer.Vector({
				style: styleFunction,
				source: new ol.source.Vector({
				})				
			});
			initMap();
            
        }
		
		function initMap(){
			var tile = new ol.layer.Tile({
				source: new ol.source.OSM()
			});
			map = new ol.Map({
				target: 'map',				
				layers: [tile,vector],
				view: new ol.View({
				  center: ol.proj.fromLonLat([5.3,52.23]),
				  zoom: 8 
				})
			});
			var element = document.getElementById('popup');
			var popup = new ol.Overlay({
			  element: element,
			  positioning: 'bottom-center',
			  stopEvent: false
			});
			map.addOverlay(popup);

			// display popup on click
			map.on('click', function(evt) {
			  var feature = map.forEachFeatureAtPixel(evt.pixel,
				  function(feature, layer) {
					return feature;
				  });
			  if (feature) {
				popup.setPosition(evt.coordinate);
				$(element).popover({
				  'placement': 'top',
				  'html': true,
				  'content': getFeatureContent(feature)
				});
				$(element).popover('show');
			  } else {
				$(element).popover('destroy');
			  }
			});
		}
		
		function getFeatureContent(feature){
			if(feature.getGeometry().getType() == 'Point'){
				var content = 'PUIC: '+feature.get('id') + '</br>'
				content += 'Naam: '+feature.get('name') + '</br>' 
				content += 'Type: '+feature.get('type');
				return content;
			}
			else{
				var content = 'PUIC: '+feature.get('id') + '</br>'
				content += 'Naam: '+feature.get('name') + '</br>'
				var length = ''+feature.getGeometry().getLength()
				length = length.split('.')[0];
				content += 'Lengte: '+length+'m';
				return content;
			}
		}
