function applyMargins() {
	var leftToggler = $(".mini-submenu-left");
	if (leftToggler.is(":visible")) {
		$("#map .ol-zoom")
		.css("margin-left", 0)
		.removeClass("zoom-top-opened-sidebar")
		.addClass("zoom-top-collapsed");
	} else {
		$("#map .ol-zoom")
		.css("margin-left", $(".sidebar-left").width())
		.removeClass("zoom-top-opened-sidebar")
		.removeClass("zoom-top-collapsed");
	}
	var html = document.documentElement;
	$('#myScrollspy').height(html.clientHeight - 50);
	$('#tableContent').height(html.clientHeight - 50);
}
function isConstrained() {
	return $(".sidebar").width() == $(window).width();
}
function applyInitialUIState() {
	if (isConstrained()) {
		$(".sidebar-left .sidebar-body").fadeOut('slide');
		$('.mini-submenu-left').fadeIn();
	}
}

function updateLayerSwitcher() {
	$("#layerList").empty();
	fillLayerSwitcher(map.getLayers(), true);
}

function fillLayerSwitcher(layers, groupVisible) {
	var lyrs = layers.getArray().slice().reverse();
	for (var i = 0, l; i < lyrs.length; i++) {
		var lyr = lyrs[i];
		if (lyr.get('title')) {
			var item = $('<a></a>');

			if (lyr.getLayers) {
				item.addClass('list-group-item active');
			} else {
				item.addClass('list-group-item');
			}
			item.attr('href', '#');
			var icon = $('<i></i>');
			if (lyr.getVisible() && groupVisible) {
				icon.addClass('fa fa-globe');
			}
			
			item.append(icon);
			item.append(lyr.get('title'));
			
			if (lyr instanceof ol.layer.Vector) {
				var f = lyr.getSource().getFeatures();
				var badge = $('<span></span>').text(''+f.length).addClass('badge');
				if(f[0].get('color')){
					badge.css({"backgroundColor": f[0].get('color')});
				}
				else{
					badge.css({"backgroundColor": f[0].get('stroke_color')});
				}
				item.append(badge);				
			}			
			item.on('click',(function (myLyr) {
				return function (e) {
					console.log('toggle ' + myLyr.get('title'));
					var visible = myLyr.getVisible();
					myLyr.setVisible(!visible);
					updateLayerSwitcher();
				}
			})(lyr));
			$("#layerList").append(item);
		}
		if (lyr.getLayers) {
			fillLayerSwitcher(lyr.getLayers(), lyr.getVisible() && groupVisible);
		}
	}
}

$(function () {
	$('.sidebar-left .slide-submenu').on('click', function () {
		var thisEl = $(this);
		thisEl.closest('.sidebar-body').fadeOut('slide', function () {
			$('.mini-submenu-left').fadeIn();
			applyMargins();
		});
	});
	$('.mini-submenu-left').on('click', function () {
		var thisEl = $(this);
		$('.sidebar-left .sidebar-body').toggle('slide');
		thisEl.hide();
		applyMargins();
	});
	$(window).on("resize", applyMargins);
	initDragAndDrop();
	initMap();
	updateLayerSwitcher(map);
	applyInitialUIState();
	applyMargins();
});
