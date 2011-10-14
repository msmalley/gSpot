// the semi-colon before function invocation is a safety net against concatenated
// scripts and/or other plugins which may not be closed properly.
;(function ( $, window, document, undefined ) {

    // undefined is used here as the undefined global variable in ECMAScript 3 is
    // mutable (ie. it can be changed by someone else). undefined isn't really being
    // passed in so we can ensure the value of it is truly undefined. In ES5, undefined
    // can no longer be modified.

    // window and document are passed through as local variables rather than globals
    // as this (slightly) quickens the resolution process and can be more efficiently
    // minified (especially when both are regularly referenced in your plugin).

    // Create the defaults once
    var pluginName = 'gSpot',
        defaults = {
            zoom: 13,
			type: 'ROADMAP',
			lat: false,
			lng: false
        };

	/* GSPOT GLOBALS */
	var map;
	var marker_count = 0;
	var marker = [];
	var info_box = [];
	var new_info_box = [];
	var clustered_markers = [];
	var marker_cluster = [];
	var map_position;
	var current_marker = [];
	var default_lat = 3.152864;
	var default_lng = 101.712624;
	var base_url = '';
	var map_container;

    // The actual plugin constructor
    function Plugin( element, options ) {
        this.element = element;

        // jQuery has an extend method which merges the contents of two or
        // more objects, storing the result in the first object. The first object
        // is generally empty as we don't want to alter the default options for
        // future instances of the plugin
        this.options = $.extend( {}, defaults, options) ;

        this._defaults = defaults;
        this._name = pluginName;

        this.init();
    }

	function is_numeric(value){
	  if(typeof value == 'number' && isFinite(value)){
		  return true;
	  } else {
		  return false;
	  }
	}

	function handle_no_geolocation(errorFlag) {
		map_position = new google.maps.LatLng(default_lat, default_lng);
		map.setCenter(map_position);
	}

	function create_infobox(this_box,map_id,opts,this_id){
		google.maps.OverlayView.call(this_box);
		this_box.latlng_ = opts.latlng;
		this_box.map_ = opts.map;
		this_box.offsetVertical_ = -83;
		this_box.offsetHorizontal_ = 36;
		this_box.maxHeight_ = ($(map_container).height() - 90);
		this_box.maxWidth_ = ($(map_container).width() - 200);
		this_box.minWidth_ = ($(map_container).width() / 3);
		this_box.mongo_id = this_id;
		var me = this_box;
		this_box.boundsChangedListener_ = google.maps.event.addListener(map, 'bounds_changed', function() {
			return me.panMap.apply(me);
		});
		this_box.setMap(this_box.map_);
	}

	function remove_infobox(this_box){
		if(this_box.div_){
			this_box.div_.parentNode.removeChild(this_box.div_);
			this_box.div_ = null;
			info_box[this_box.mongo_id] = null;
		}
	}

	function draw_infobox(this_box){
		this_box.createElement();
		if(!this_box.div_) return;
		var pixPosition = this_box.getProjection().fromLatLngToDivPixel(this_box.latlng_);
		if (!pixPosition) return;
		this_box.div_.style.maxWidth = this_box.maxWidth_ + 'px';
		this_box.div_.style.left = (pixPosition.x + this_box.offsetHorizontal_) + 'px';
		this_box.div_.style.maxHeight = this_box.maxHeight_ + 'px';
		this_box.div_.style.height = 'auto';
		this_box.div_.style.top = (pixPosition.y + this_box.offsetVertical_) + 'px';
		this_box.div_.style.display = 'block';
	}

	function fill_infobox(this_box, this_url, title, content, this_id){
		var panes = this_box.getPanes();
		var div = this_box.div_;
		if(!div){
			/* WINDOW WRAPPER */
			div = this_box.div_ = document.createElement('div');
			jQuery(div).addClass('info-window-wrapper').css({
				'max-width':this_box.maxWidth_ +'px',
				'min-width':this_box.minWidth_ +'px',
				'max-height':this_box.maxHeight_ +'px'
			});
			/* WINDOW CONTENT */
			var content_div = document.createElement('div');
			jQuery(content_div).addClass('info-window-content').css({
				'max-height':(this_box.maxHeight_ - 100) +'px'
			}).html(content);
			/* CLOSE ICON */
			var title_bar = document.createElement('div');
			var close_img = document.createElement('img');
			jQuery(close_img).addClass('close-icon').attr('src',base_url+'img/close.png');
			/* TITLE BAR */
			var title_content = '<div class="infobox-title"><a href="'+this_url+'">'+title+'</a></div>';
			jQuery(title_bar).addClass('info-window-title').html(title_content);
			title_bar.appendChild(close_img);
			/* ESTABLISH ACTIONS */
			function removeInfoBox(ib) {
				return function() {
					ib.setMap(null);
				};
			}
			function stealAction_(e) {
				if(navigator.userAgent.toLowerCase().indexOf('msie') != -1 && document.all) {
					window.event.cancelBubble = true;
					window.event.returnValue = false;
				}else{
					e.stopPropagation();
				}
			}
			/* CONTROL ACTIONS WITHIN INFO WINDOW */
			google.maps.event.addDomListener(close_img, 'click', removeInfoBox(this_box));
			google.maps.event.addDomListener(content_div, 'dblclick', stealAction_);
			google.maps.event.addDomListener(content_div, 'mousedown', stealAction_);
			google.maps.event.addDomListener(content_div, 'mousewheel', stealAction_);
			google.maps.event.addDomListener(content_div, 'DOMMouseScroll', stealAction_);
			google.maps.event.addDomListener(content_div, 'mousemove', stealAction_);
			/* CONSTRUCT THE WINDOW */
			div.appendChild(title_bar);
			div.appendChild(content_div);
			div.style.display = 'none';
			panes.floatPane.appendChild(div);
			this_box.panMap();
		} else if (div.parentNode != panes.floatPane) {
			div.parentNode.removeChild(div);
			panes.floatPane.appendChild(div);
		} else {
			// The panes have not changed, so no need to create or move the div.
		}
	}

	function pan_infobox(this_box){
		var map = this_box.map_;
		var bounds = map.getBounds();
		if (!bounds) return;
		var position = this_box.latlng_;
		var iwWidth = jQuery(this_box.div_).width();
		var iwHeight = jQuery(this_box.div_).height();
		var mapDiv = map.getDiv();
		var mapWidth = mapDiv.offsetWidth;
		var mapHeight = mapDiv.offsetHeight;
		var boundsSpan = bounds.toSpan();
		var longSpan = boundsSpan.lng();
		var latSpan = boundsSpan.lat();
		var degPixelX = longSpan / mapWidth;
		var degPixelY = latSpan / mapHeight;
		var centerX = position.lng() + ( iwWidth / 2) * degPixelX;
		var centerY = position.lat() - ( iwHeight / 2) * degPixelY;
		map.panTo(new google.maps.LatLng(centerY, centerX));
		google.maps.event.removeListener(this_box.boundsChangedListener_);
		this.boundsChangedListener_ = null;
	}

	function map_cluster(map_id){
		var styles = [[{
		  url: base_url+'img/shadow.png',
		  height: 62,
		  width: 62,
		  opt_anchor: [16, 0],
		  opt_textColor: '#333333',
		  opt_textSize: 18
		}, {
		  url: base_url+'img/shadow.png',
		  height: 62,
		  width: 62,
		  opt_anchor: [16, 0],
		  opt_textColor: '#333333',
		  opt_textSize: 18
		}, {
		  url: base_url+'img/shadow.png',
		  height: 62,
		  width: 62,
		  opt_anchor: [16, 0],
		  opt_textColor: '#333333',
		  opt_textSize: 18
		}]];
		if(marker_cluster[map_id]){
			marker_cluster[map_id].clearMarkers();
			//-> USING THIS MAKES MARKERS SKIP MAPS WHEN 2 OR MORE MAPS ON ONE PAGE
		}
		var zoom = 18;
		var size = 75;
		var style = 0;
		marker_cluster[map_id] = new MarkerClusterer(map, clustered_markers[map_id], {
			maxZoom: zoom,
			gridSize: size,
			styles: styles[style]
		});
	}

	function construct_infobox(this_id,map_id,opts,this_url,title,content){
		info_box[this_id] = function(map_id,opts){
			create_infobox(this,map_id,opts,this_id);
		}
		info_box[this_id].prototype = new google.maps.OverlayView();
		info_box[this_id].prototype.remove = function() {
			remove_infobox(this);
		};
		info_box[this_id].prototype.draw = function() {
			draw_infobox(this);
		};
		info_box[this_id].prototype.createElement = function() {
			fill_infobox(this, this_url, title, content, this_id);
		}
		info_box[this_id].prototype.panMap = function() {
			pan_infobox(this);
		};
		new_info_box[this_id] = new info_box[this_id](
			map_id,
			{latlng: marker[this_id].getPosition(), map: marker[this_id].map}
		);
		map_cluster($(map_container).attr('id'));
	}

	function add_marker(map_id,lat,lng,title,content,this_id,slug){
		var open_mongobox = false;
		if((lat==current_marker['lat'])&&(lng==current_marker['lng'])){ open_mongobox = true; }
		var lat_lng = new google.maps.LatLng(lat,lng);
		var this_url = base_url+slug;
		var image = new google.maps.MarkerImage(
			base_url+'img/default_marker.png',
			new google.maps.Size(26,26),
			new google.maps.Point(0,0),
			new google.maps.Point(13,13)
		);
		var shadow = new google.maps.MarkerImage(
			base_url+'img/shadow.png',
			new google.maps.Size(62,62),
			new google.maps.Point(0,0),
			new google.maps.Point(31,30)
		);
		marker[this_id] = new google.maps.Marker({
			position: lat_lng,
			icon: image,
			shadow: shadow,
			map: map,
			title: title
		});
		clustered_markers[map_id][marker_count] = marker[this_id];
		if(open_mongobox){
			if(info_box[this_id]==null){
				construct_infobox(
					this_id,
					map_id,
					{latlng: marker[this_id].getPosition(), map: marker[this_id].map},
					this_url,
					title,
					content
				);
			}
		}
		google.maps.event.addListener(marker[this_id], "click", function(e) {
			if(info_box[this_id]==null){
				construct_infobox(
					this_id,
					map_id,
					{latlng: marker[this_id].getPosition(), map: marker[this_id].map},
					this_url,
					title,
					content
				);
			}
		});
		marker_count++;
	}

    Plugin.prototype.init = function () {
        // Place initialization logic here
        // You already have access to the DOM element and the options via the instance,
        // e.g., this.element and this.options

		if(this.options.debug===true){
			console.log(this.element);
			console.log(this.options);
		} map_container = this.element;

		if((!is_numeric(this.options.lat)) && (this.options.lat!==false)){
			this.options.lat = default_lat;
		} if((!is_numeric(this.options.lng)) && (this.options.lng!==false)){
			this.options.lng = default_lng;
		}

		var map_type = false;
		if(this.options.type=='SATELLITE'){
			map_type = google.maps.MapTypeId.SATELLITE;
		}else{
			map_type = google.maps.MapTypeId.ROADMAP;
		}

		clustered_markers[$(this.element).attr('id')] = [];

		var map_options = {
			zoom: this.options.zoom,
			mapTypeId: map_type
		};
		map = new google.maps.Map(document.getElementById($(this.element).attr('id')), map_options);

		html5_status = false;

		if((this.options.lat===false)&&(this.options.lng===false)){
			// Try HTML5 geolocation
			if(navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(function(position) {
					html5_status = 'Browser supports and uses HTML5 Geo-Location';
					map_position = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
					map.setCenter(map_position);
				}, function() {
					html5_status = 'Browser supports HTML5 Geo-Location';
					handle_no_geolocation(true);
				});
			}else{
			  html5_status = 'Browser does not support HTML5 Geo-Location';
			  handle_no_geolocation(false);
			}
		}else{
			html5_status = 'Specific Lat / Lng Used';
			current_marker['lat']=this.options.lat;
			current_marker['lng']=this.options.lng;
			map_position = new google.maps.LatLng(this.options.lat,this.options.lng);
			map.setCenter(map_position);
		}

		if(this.options.debug===true){
			console.log('HTML5 Status = ', html5_status);
			console.log('THIS LAT = ', this.options.lat);
			console.log('THIS LNG = ', this.options.lng);
		}

		for(i=0; i< this.options.markers.length; i++) {
			if(this.options.debug===true){
				console.log(this.options.markers[i]);
			} add_marker(
				$(this.element).attr('id'),
				this.options.markers[i].lat,
				this.options.markers[i].lng,
				this.options.markers[i].title,
				this.options.markers[i].content,
				this.options.markers[i].this_id,
				this.options.markers[i].slug
			)
		}

    };

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[pluginName] = function ( options ) {
        return this.each(function () {
            if (!$.data(this, 'plugin_' + pluginName)) {
                $.data(this, 'plugin_' + pluginName, new Plugin( this, options ));
            }
        });
    }

})( jQuery, window, document );