function buildDataTables(typeMap) {
	$('#tableLegend').empty();
	$('#tableContent').empty();
	var first = true;
	$.each(typeMap, function (type, renderableObjects) {
		//console.log(type + ' ' + renderableObjects.length + ' items');
		var tableDiv = $('<div></div>').attr('id', type);
		var table = $('<table></table>').addClass('table table-bordered');
		var thead = $('<thead></thead>');
		var tr = $('<tr></tr>');
		var dataObject = renderableObjects[0];
		var attrs = dataObject.attributes;
		var $do = $(dataObject);
		var headers = [];
		for (var i = 0; i < attrs.length; i++) {
			headers.push(attrs[i].nodeName);
			tr.append($('<th>' + attrs[i].nodeName + '</th>'));
		}
		thead.append(tr);
		table.append(thead);
		var tbody = $('<tbody></tbody>');
		for (var i = 0; i < renderableObjects.length; i++) {
			var row = $('<tr></tr>');

			for (var j = 0; j < headers.length; j++) {
				var value = $(renderableObjects[i]).attr(headers[j]);
				var rowData = $('<td></td>').text(value);
				row.append(rowData);
			}
			row.append(rowData);
			tbody.append(row);
		}
		table.append(tbody);
		var title = $('<h1>' + type + ' (' + renderableObjects.length + ')</h1>');
		var legendItem = $('<li></li>').append('<a href="#' + type + '">' + type + '</a>');
		if(first){
			legendItem.addClass('active');
			first = false;
		}
		$('#tableLegend').append(legendItem);
		tableDiv.append(title);
		var par = $('<p></p>');
		par.append(table);
		tableDiv.append(par);
		$('#tableContent').append(tableDiv);
	});
}
