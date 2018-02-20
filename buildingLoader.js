// http://geodata.nationaalgeoregister.nl/inspire/bu/wfs?LAYERS=BU.Building&OUTPUTFORMAT=JSON&SERVICE=WFS&VERSION=2.0.0&REQUEST=GetMap&STYLES=&SRS=EPSG%3A28992&BBOX=133039.67950021,453699.84022522,136250.15950021,455547.00022522
/*
var pand_url = 'https://geodata.nationaalgeoregister.nl/bag/wfs?';
var params = 'request=GetFeature&';
params += 'service=WFS&';
params += 'typeName=bag:pand&';
params += 'outputFormat=json&';
params += 'srsName=EPSG:28992&';
params += 'bbox=149377.3311,490758.601,165597.127,506881.853';
var ahn_url = "http://geodata.nationaalgeoregister.nl/ahn2/wms?";
 */
function getBuildings(geom, onSucces) {
	var writer = new jsts.io.WKTWriter();
	var wktMLS = writer.write(geom);
	var pand_url = 'https://geodata.nationaalgeoregister.nl/bag/wfs?';
	var params = 'request=GetFeature&';
	params += 'service=WFS&';
	params += 'typeName=bag:pand&';
	params += 'outputFormat=json&';
	params += 'srsName=EPSG:28992&';
	params += 'cql_filter=Within(geometry,' + wktMLS + ')';
	$.get(pand_url + params, onSucces);
}

function getBuildingsWkt(wktMLS,bufferSize, onSucces) {
	var pand_url = 'https://geodata.nationaalgeoregister.nl/bag/wfs?';
	var params = 'request=GetFeature&';
	params += 'service=WFS&';
	params += 'typeName=bag:pand&';
	params += 'outputFormat=json&';
	params += 'srsName=EPSG:28992&';
	params += 'cql_filter=DWithin(geometrie,' + wktMLS + ','+bufferSize+',meters)';
	//console.log(pand_url + params);
	$.get(pand_url + params, onSucces);
}

