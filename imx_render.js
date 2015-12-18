		var map,vector;
		var image = new ol.style.Circle({
			radius: 4,
			stroke: new ol.style.Stroke({color: 'red', width: 4})
		});
		var styles = {
		  'Point': [new ol.style.Style({
			image: image,
			text: new ol.style.Text({
				text: '',
				fill: new ol.style.Fill({color: 'red'}),
				stroke: new ol.style.Stroke({color: 'red', width: 1}),
				offsetX: 0,
				offsetY: 0,
			})
		  })],
		  'LineString': [new ol.style.Style({
			stroke: new ol.style.Stroke({
			  color: 'blue',
			  width: 4
			}),
			text: new ol.style.Text({
				text: '',
				fill: new ol.style.Fill({color: 'black'}),
				stroke: new ol.style.Stroke({color: 'black', width: 1}),
				offsetX: 0,
				offsetY: 0,
			})
		  })]		  
		};
		
		var styleFunction = function(feature, resolution) {
			var ft = feature.getGeometry().getType();
			var style;
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
			else if(ft == 'LineString'){
				style = new ol.style.Style({
					stroke: new ol.style.Stroke({
					  color: 'blue',
					  width: 4
					}),
					text: new ol.style.Text({
						text: feature.get('label'),
						fill: new ol.style.Fill({color: 'blue'}),
						stroke: new ol.style.Stroke({color: 'blue', width: 1}),
						offsetX: 0,
						offsetY: -5,
					})
				});
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
		
		function fillLegend(xmlDoc){
			var legend = document.getElementById("legend");
			if(legend){
				legend.appendChild(listItem('Knopen: '+xmlDoc.getElementsByTagName("Node").length));
				legend.appendChild(listItem('Takken: '+xmlDoc.getElementsByTagName("Edge").length));
				legend.appendChild(listItem('Wissels: '+count(xmlDoc,"Junction",'junctionType','singleSwitch')));
				legend.appendChild(listItem('Stootjukken: '+count(xmlDoc,'Junction','junctionType','bufferStop')));
				legend.appendChild(listItem('Engelse Wissels: '+count(xmlDoc,'Junction','junctionType','fullSlipCrossing')));
				legend.appendChild(listItem('Half Engelse Wissels: '+count(xmlDoc,'Junction','junctionType','slipCrossing')));
				legend.appendChild(listItem('Kruizen: '+count(xmlDoc,'Junction','junctionType','crossing')));
			}
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
		
		function listItem(text){
			var listItem = document.createElement('p');
			listItem.innerHTML = text;
			return listItem;
		}
		
		function procesJunctions(xmlDoc){
			var junctions = xmlDoc.getElementsByTagName("Junction");
			for(var i=0;i<junctions.length;i++){
				var poslist = junctions[i].getElementsByTagName("posList")[0].childNodes[0];
				if(poslist != undefined){
					var coordValues = poslist.nodeValue.split(' ');
					var point = new ol.geom.Point([coordValues[0],coordValues[1]]);
					point.transform(ol.proj.get("EPSG:28992"),map.getView().getProjection());
					var feature = new ol.Feature({
					  geometry: point,
					  id: junctions[i].attributes['nodeRef'].value,
					  name: junctions[i].attributes['name'].value,
					  label: junctions[i].attributes['name'].value,
					  type: junctions[i].attributes['junctionType'].value,
					});
					vector.getSource().addFeature(feature);
				}
			}
		}
		
		function procesTracks(xmlDoc){
			var tracks = xmlDoc.getElementsByTagName("Track");
			console.log('tracks gevonden: '+tracks.length);
			for(var i=0;i<tracks.length;i++){
				var poslist = tracks[i].getElementsByTagName("posList")[0].childNodes[0];
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
					  id: tracks[i].attributes['edgeRef'].value,
					  name: tracks[i].attributes['name'].value,
					  label: tracks[i].attributes['name'].value
					});
					vector.getSource().addFeature(feature);
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
