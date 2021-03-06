/*!
 * easy-locator 1.0.11
 * https://github.com/tete-chercheuse/easy-locator
 */

(function($) {
	var self = this;
	var deferEvents = $.Deferred();

	this.easyLocatorMethods = {
		element:              null,
		locations:            [],
		onEvents:             deferEvents.promise(),
		locationActive:       null,
		htmlPlug:             '<div class="locator-map-loading"></div>' +
			                      '<div id="locator-map" class="locator-map-map"></div>' +
			                      '<div class="locator-map-template"></div>',
		options:              {
			apiKey:                   null,
			spreadsheetId:            null,
			spreadsheetSheet:         1,
			mapContainer:             null,
			map:                      null,
			mapOptions:               null,
			isAPIloaded:              false,
			myLocations:              [],
			markerIcon:               {
				url:  null,
				size: { w: 32, h: 32 }
			},
			centerMapOnLocation:      true,
			infoWindowFields:         [],
			infoWindowCustomClass:    'locator-map-infowindow',
			openInfowindowAfterClick: false,
			contentTemplate:          null,
			useMarkerCluster:         false,
			markerClustererOptions:   {
				maxZoom: 12
			}
		},
		loadScripts:          function(container) {

			this.showHideLoader('show');

			var scriptMapUrl = 'https://maps.googleapis.com/maps/api/js?libraries=places&callback=window.easyLocatorMethods.loadMap';

			if(typeof google === 'object' && typeof google.maps === 'object') {
				self.easyLocatorMethods.options.isAPIloaded = true;
				this.loadMap();
			}
			else {

				if(this.options.apiKey !== null) {
					scriptMapUrl = 'https://maps.googleapis.com/maps/api/js?libraries=places&key=' + this.options.apiKey + '&callback=window.easyLocatorMethods.loadMap';
				}

				var script = document.createElement('script');
				script.type = 'text/javascript';
				script.src = scriptMapUrl
				document.body.appendChild(script);
			}

		},
		loadMap:              function() {

			self.easyLocatorMethods.triggerEvent({
				eventName: 'loadingMap',
				data:      {}
			});

			this.options.isAPIloaded = true;
			var mapOptions;

			if(this.options.mapOptions === null) {
				mapOptions = {
					zoom:      8,
					center:    new google.maps.LatLng(-34.397, 150.644),
					mapTypeId: google.maps.MapTypeId.ROADMAP
				};
			}
			else {
				mapOptions = this.options.mapOptions;
			}

			this.options.map = new google.maps.Map(document.getElementById('locator-map'), mapOptions);

			this.options.markerClusterer = new MarkerClusterer(this.options.map, null, this.options.markerClustererOptions);

			google.maps.event.addListenerOnce(this.options.map, 'idle', function() {

				self.easyLocatorMethods.triggerEvent({
					eventName: 'mapLoaded',
					data:      {}
				});

				if(self.easyLocatorMethods.options.spreadsheetId !== null) {
					self.easyLocatorMethods.getJsonData();
					return;
				}

				if(self.easyLocatorMethods.options.myLocations.length > 0) {
					self.easyLocatorMethods.loadMyLocations();
				}

			});

			if(this.options.contentTemplate === null) {

				this.options.infoWindow = new google.maps.InfoWindow({ maxWidth: 480 });

				google.maps.event.addListener(this.options.infoWindow, 'closeclick', function() {

					self.easyLocatorMethods.triggerEvent({
						eventName: 'infoWindowClosed',
						data:      {}
					});
				});
			}

		},
		showHideLoader:       function(action) {
			if(action === 'show') {
				$('.locator-map-loading').show();
			}
			else {
				$('.locator-map-loading').hide();
			}
		},
		getJsonData:          function() {
			var script = document.createElement('script');
			script.type = 'text/javascript';
			script.src = 'https://spreadsheets.google.com/feeds/list/' + this.options.spreadsheetId + '/' + this.options.spreadsheetSheet + '/public/values?hl=en_US&alt=json&callback=window.easyLocatorMethods.successGetJsonData';
			script.async = true;
			document.body.appendChild(script);
		},
		createLocation:       function(info) {

			var marker_lat = info.lat.replace(",", ".");
			var marker_lng = info.lng.replace(",", ".");

			var marker = new google.maps.Marker({
				position: new google.maps.LatLng(marker_lat, marker_lng),
				map:      this.options.map,
				title:    info.title
			});

			if((info.markerIcon && info.markerIcon !== '') || this.options.markerIcon.url !== null) {

				marker.setIcon({
					url:        (info.markerIcon && info.markerIcon !== '') ? info.markerIcon : this.options.markerIcon.url,
					scaledSize: new google.maps.Size(this.options.markerIcon.size.w, this.options.markerIcon.size.h)
				});
			}

			var newLocation = {
				index:  info.index,
				marker: marker,
				active: false
			};

			if(this.options.useMarkerCluster) {
				this.options.markerClusterer.addMarker(marker);
			}

			return {
				location: newLocation,
			};
		},
		successGetJsonData:   function(json) {

			for(var i = 0; i < json.feed.entry.length; i++) {
				var entry = json.feed.entry[i];

				var entry_lat = entry.gsx$lat.$t.replace(",", ".");
				var entry_lng = entry.gsx$lng.$t.replace(",", ".");

				var newLocation = this.createLocation({
					index: i,
					lat:   entry_lat,
					lng:   entry_lng,
				});

				if(this.options.infoWindowFields.length > 0) {
					this.options.infoWindowFields.forEach(function(element, index) {
						if(entry.hasOwnProperty('gsx$' + element)) {
							newLocation.location[element] = entry['gsx$' + element].$t;
						}
					});
				}

				this.locations.push(newLocation.location);
			}

			this.loadItemsOnList();

			self.easyLocatorMethods.triggerEvent({
				eventName: 'getDataDone',
				data:      this.locations
			});
		},
		loadMyLocations:      function() {
			for(var i = 0; i < this.options.myLocations.length; i++) {
				var entry = this.options.myLocations[i];

				entry.index = i;
				var newLocation = this.createLocation(entry);
				//to keep the original properties
				$.extend(newLocation.location, entry);

				this.locations.push(newLocation.location);
			}

			this.loadItemsOnList();

			self.easyLocatorMethods.triggerEvent({
				eventName: 'getDataDone',
				data:      this.locations
			});
		},
		loadItemsOnList:      function() {
			this.attachEventLocations();
			this.showHideLoader('hide');

			if(this.options.centerMapOnLocation) {
				this.centerMapOnLocations();
			}
		},
		centerMapOnLocations: function() {
			var bounds = new google.maps.LatLngBounds();

			for(var i = 0; i < this.locations.length; i++) {
				bounds.extend(this.locations[i].marker.getPosition());
			}

			this.options.map.fitBounds(bounds);
		},
		attachEventLocations: function() {
			function createEvent(location) {
				google.maps.event.addListener(location.marker, 'click', function() {

					if(self.easyLocatorMethods.options.contentTemplate === null) {
						self.easyLocatorMethods.openInfoWindow(location);
					}
					else {
						self.easyLocatorMethods.openTemplate(location);
					}

					self.easyLocatorMethods.triggerEvent({
						eventName: 'locationClicked',
						data:      location
					});
				});
			}

			for(var i = 0; i < this.locations.length; i++) {
				createEvent(this.locations[i]);
			}

			$(this.options.mapContainer).on('click', '.close', function() {
				self.easyLocatorMethods.closeTemplate();
			});
		},
		openTemplate:         function(location) {
			var compiled = _.template(this.options.contentTemplate);
			var containerTemplate = $(this.options.mapContainer).find('.locator-map-template');
			containerTemplate.html(compiled(location));
			containerTemplate.show();
		},
		triggerEvent:         function(data) {
			deferEvents.notify(data);
		},
		closeTemplate:        function() {
			$(this.options.mapContainer).find('.locator-map-template').hide();

			self.easyLocatorMethods.triggerEvent({
				eventName: 'templateClosed',
				data:      {}
			});
		},
		openInfoWindow:       function(location) {
			this.locationActive = location;

			var innerHtml = '';

			if(this.options.infoWindowFields.length > 0) {

				this.options.infoWindowFields.forEach(function(element, index) {

					if(location.hasOwnProperty(element) && !_.isEmpty(location[element])) {

						if(_.includes(element, 'image')) {
							innerHtml += '<div class="' + element + '"><img src="' + location[element] + '" alt="' + element + '"/></div>';
						}
						else if(_.includes(element, 'url')) {
							innerHtml += '<div class="' + element + '"><a href="' + location[element] + '" target="_blank">' + location[element] + '</a></div>';
						}
						else if(_.includes(element, 'email')) {
							innerHtml += '<div class="' + element + '"><a href="mailto:' + location[element] + '">' + location[element] + '</a></div>';
						}
						else if(_.includes(element, 'phone')) {
							innerHtml += '<div class="' + element + '"><a href="tel:' + location[element] + '">' + location[element] + '</a></div>';
						}
						else {
							innerHtml += '<div class="' + element + '">' + location[element] + '</div>';
						}
					}
				});
			}

			var contentHTML = '<div id="locator-map-infowindow" class="' + self.easyLocatorMethods.options.infoWindowCustomClass + '">' + innerHtml + '</div>';
			this.options.infoWindow.setContent(contentHTML);
			this.options.infoWindow.open(this.options.map, location.marker);
		},
		getMapInstance:       function() {
			return this.options.map;
		},
		cleanMap:             function() {
			for(var i = 0; i < this.locations.length; i++) {
				this.locations[i].marker.setMap(null);
			}

			if(this.options.useMarkerCluster) {
				this.options.markerClusterer.clearMarkers();
			}
		},
		rebuild:              function(newLocations) {
			this.cleanMap();

			this.locations = [];

			for(var i = 0; i < newLocations.length; i++) {
				var entry = newLocations[i];
				var currentPosition;

				if(entry.marker) {
					currentPosition = entry.marker.getPosition();
				}
				else {
					currentPosition = new google.maps.LatLng(entry.lat, entry.lng)
				}

				var marker = new google.maps.Marker({
					position: currentPosition,
					map:      this.options.map,
					title:    entry.title
				});

				var newItem = {
					index:  i,
					active: false
				};

				$.extend(newItem, entry);
				newItem.marker = marker;

				if(this.options.useMarkerCluster) {
					this.options.markerClusterer.addMarker(marker);
				}

				this.locations.push(newItem);
			}

			self.easyLocatorMethods.triggerEvent({
				eventName: 'rebuildDone',
				data:      {}
			});

		}
	};

	$.fn.easyLocator = function(options) {
		//custom contain selector to convert to handle Case-Insensitive
		jQuery.expr[':'].contains_ = function(a, i, m) {
			return (a.textContent || a.innerText || "").toUpperCase().indexOf(m[3].toUpperCase()) >= 0;
		};

		self.easyLocatorMethods.element = this;

		self.easyLocatorMethods.element.addClass('locator-map');

		self.easyLocatorMethods.onEvents.progress(function(e) {
			self.easyLocatorMethods.element.trigger({
				type:   e.eventName,
				params: e.data
			});
		});

		self.easyLocatorMethods.element.html(self.easyLocatorMethods.htmlPlug);
		// This is the easiest way to have default options.
		self.easyLocatorMethods.options = $.extend(self.easyLocatorMethods.options, options);
		self.easyLocatorMethods.options.mapContainer = this;
		self.easyLocatorMethods.loadScripts();

		return self.easyLocatorMethods;
	};

}(jQuery));
