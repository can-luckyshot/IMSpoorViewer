var tableTypeMap;

function setTableTypeMap(typeMap) {
	tableTypeMap = typeMap;
}

function loadDataTables() {
	console.log('loadDataTables');
	if (tableTypeMap) {
		buildDataTables(tableTypeMap);
		tableTypeMap = undefined; // load only once;
	} else {
		console.log('no data yet');
	}
}

function createMessageTable(entry) {
	var type = 'Message';
	var tableDiv = $('<div></div>').attr('id', type);
	var table = $('<table></table>').addClass('table table-bordered');
	var thead = $('<thead></thead>');
	var tr = $('<tr><th>Puics</th><th>Code</th><th>Message</th></tr>');
	var tbody = $('<tbody></tbody>');
	thead.append(tr);
	table.append(thead);
	var renderableObjects = entry.list;
	for (var i = 0; i < renderableObjects.length; i++) {
		var row = $('<tr></tr>');
		var puics = $(renderableObjects[i]).find('puics');
		if(puics.length){
			var cell = $('<td></td>');
			var list = $('<ul></ul>');
			cell.append(list);
			$.each(puics, function (index, puicItem) {
				var puic = $(puicItem).text();
				var link = $('<a></a>').text(puic).on('click', jumpToFeature);
				var listItem = $('<li></li>');
				listItem.append(link);
				list.append(listItem);
			});
			row.append(cell);
		}
		else{
			var value = puics.text();
			row.append($('<td></td>').text(value));
		}
		tbody.append(row);

		var value = $(renderableObjects[i]).find('code').text();
		var rowData = $('<td></td>').text(value);
		row.append(rowData);
		tbody.append(row);

		value = $(renderableObjects[i]).find('message').text();
		rowData = $('<td></td>').text(value);
		row.append(rowData);
		tbody.append(row);
	}
	table.append(tbody);
	var title = $('<h1>' + type + ' (' + renderableObjects.length + ')</h1>');
	var legendItem = $('<li></li>').append('<a href="#' + type + '">' + type + '</a>');
	$('#tableLegend').append(legendItem);
	tableDiv.append(title);
	var par = $('<p></p>');
	par.append(table);
	tableDiv.append(par);
	$('#tableContent').append(tableDiv);
}

function buildDataTables(typeMap) {
	$('#tableLegend').empty();
	$('#tableContent').empty();
	var first = true;
	$.each(typeMap, function (type, entry) {
		if (type === 'Message') {
			createMessageTable(entry);
		} else {
			var color = entry.color;
			var renderableObjects = entry.list;
			//console.log(type + ' ' + renderableObjects.length + ' items');
			var tableDiv = $('<div></div>').attr('id', type);
			var table = $('<table></table>').addClass('table table-bordered');
			var thead = $('<thead></thead>');
			var tr = $('<tr></tr>');
			var headers = new Object();
			$.each(renderableObjects, function (index, dataObject) {
				$.each(dataObject.attributes, function (index, attrib) {
					headers[attrib.nodeName] = attrib.nodeName;
				});
			});
			$.each(headers, function (header, value) {
				tr.append($('<th>' + header + '</th>'));
			});
			thead.append(tr);
			table.append(thead);
			var tbody = $('<tbody></tbody>');
			for (var i = 0; i < renderableObjects.length; i++) {
				var row = $('<tr></tr>');

				$.each(headers, function (header, value) {
					var value = $(renderableObjects[i]).attr(header);
					if (header.toLowerCase().indexOf('puic') > -1) {
						var link = $('<a></a>').text(value).on('click', jumpToFeature);
						var rowData = $('<td></td>').append(link);
						row.append(rowData);
					} else {
						var rowData = $('<td></td>').text(value);
						row.append(rowData);
					}
				});
				tbody.append(row);
			}
			table.append(tbody);
			var title = $('<h1>' + type + ' (' + renderableObjects.length + ')</h1>');
			var legendItem = $('<li></li>').append('<a href="#' + type + '">' + type + '</a>');
			if (first) {
				legendItem.addClass('active');
				first = false;
			}
			$('#tableLegend').append(legendItem);
			tableDiv.append(title);
			var par = $('<p></p>');
			par.append(table);
			tableDiv.append(par);
			$('#tableContent').append(tableDiv);
		}
	});
}

function jumpToFeature(evt) {
	var puic = event.target.text;
	console.log('jump to puic: ' + puic);
	var layers = vectorLayers.getLayers().getArray();
	console.log('layers: ' + layers.length);
	for (var i = 0; i < layers.length; i++) {
		var subLayers = layers[i].getLayers().getArray();
		console.log('subLayers: ' + subLayers.length);
		for (var j = 0; j < subLayers.length; j++) {
			console.log('subLayer: ' + subLayers[j].get('title'));
			var feature = subLayers[j].getSource().getFeatureById(puic);
			if (feature) {
				console.log('gevonden: ' + feature);
				map.getView().fit(feature.getGeometry(), map.getSize());
				var zoom = map.getView().getZoom();
				if (zoom >= 20) {
					map.getView().setZoom(20);
				}
				console.log('show tab mapviewer')
				$('.navbar-nav a[href="#mapviewer"]').tab('show');
				break;
			}
		}
	};
}
