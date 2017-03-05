// http://geodata.nationaalgeoregister.nl/inspire/bu/wfs?LAYERS=BU.Building&OUTPUTFORMAT=JSON&SERVICE=WFS&VERSION=2.0.0&REQUEST=GetMap&STYLES=&SRS=EPSG%3A28992&BBOX=133039.67950021,453699.84022522,136250.15950021,455547.00022522

var ahn_url = "http://geodata.nationaalgeoregister.nl/ahn2/wms?";

function getBuildings(minX, minY, maxX, maxY,size, onSucces) {
	var url = ahn_url;
	url += "bbox=" + minX + "," + minY + "," + maxX + "," + maxY;
	url += "&service=wms";
	url += "&VERSION=1.1.1";
	url += "&REQUEST=GetMap";
	url += "&LAYERS=ahn2_05m_ruw";
	url += "&WIDTH="+size;
	url += "&HEIGHT="+size;
	url += "&FORMAT=image/png";
	url += "&SRS=EPSG:28992"
	var loader = new THREE.ImageLoader();
	loader.crossOrigin = true;
	loader.load(url, onSucces);
}