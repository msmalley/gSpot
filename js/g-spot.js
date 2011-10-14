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

    Plugin.prototype.init = function () {
        // Place initialization logic here
        // You already have access to the DOM element and the options via the instance,
        // e.g., this.element and this.options

		if(this.options.debug===true){
			console.log(this.element);
			console.log(this.options);
		}

		if((!is_numeric(this.options.lat)) && (this.options.lat!==false)){
			this.options.lat = default_lat;
		} if((!is_numeric(this.options.lng)) && (this.options.lng!==false)){
			this.options.lng = default_lng;
		}

		if(this.options.type=='SATELLITE'){
			var map_type = google.maps.MapTypeId.SATELLITE
		}else{
			var map_type = google.maps.MapTypeId.ROADMAP
		}

		clustered_markers[$(this.element).attr('id')] = [];

		var map_options = {
			zoom: this.options.zoom,
			mapTypeId: map_type
		};
		map = new google.maps.Map(document.getElementById($(this.element).attr('id')), map_options);

		if((!this.options.lat)&&(!this.options.lng)){
			// Try HTML5 geolocation
			if(navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(function(position) {
					map_position = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
					map.setCenter(map_position);
				}, function() {
					handle_no_geolocation(true);
				});
			}else{
			  // Browser doesn't support Geolocation
			  handle_no_geolocation(false);
			}
		}else{
			current_marker['lat']=this.options.lat;
			current_marker['lng']=this.options.lng;
			map_position = new google.maps.LatLng(this.options.lat,this.options.lng);
			map.setCenter(map_position);
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