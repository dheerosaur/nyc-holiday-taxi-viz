google.maps.event.addDomListener(window, 'load', init);

function init() {
  // Basic options for a simple Google Map
  // For more options see: https://developers.google.com/maps/documentation/javascript/reference#MapOptions
  var mapOptions = {
    // How zoomed in you want the map to start at (always required)
    zoom: 11,

    // The latitude and longitude to center the map (always required)
    center: new google.maps.LatLng(40.6700, -73.9400), // New York

    // How you would like to style the map. 
    // This is where you would paste any style found on Snazzy Maps.
    styles: [
      {
        "featureType": "water",
        "stylers": [ { "hue": "#46bcec" }, { "saturation": -20 } ]
      },
      {
        "featureType": "landscape",
        "stylers": [ { "color": "#f2f2f2" } ]
      },
      {
        "featureType": "road",
        "stylers": [ { "saturation": -100 }, { "lightness": 45 } ]
      },
      {
        "featureType": "road.highway",
        "stylers": [ { "visibility": "simplified" } ]
      },
      {
        "featureType": "road.arterial",
        "elementType": "labels.icon",
        "stylers": [ { "visibility": "off" } ]
      },
      {
        "featureType": "administrative",
        "elementType": "labels.text.fill",
        "stylers": [ { "color": "#444444" } ]
      },
      {
        "featureType": "transit",
        "stylers": [ { "visibility": "off" } ]
      },
      {
        "featureType": "transit.station.airport",
        "stylers": [ { "visibility": "on" } ]
      },
      {
        "featureType": "transit.station.airport",
        "elementType": "labels.text.fill",
        "stylers": [ { "color": "#ff4444" } ]
      },
      {
        "featureType": "transit.station.airport",
        "elementType": "geometry.fill",
        "stylers": [ { "color": "#aaaaaa" } ]
      },
      {
        "featureType": "poi",
        "stylers": [ { "visibility": "off" } ]
      }
    ]
  };

  // Get the HTML DOM element that will contain your map 
  // We are using a div with id="map" seen below in the <body>
  var mapElement = document.getElementById('map-canvas');

  // Create the Google Map using out element and options defined above
  var map = new google.maps.Map(mapElement, mapOptions);

  google.maps.event.addListenerOnce(map, 'idle', function(){

    var longestTrip = _.max(TRIPS, function (trip) {
      return trip.trip_time_in_secs;
    });

    var maxTripTime = parseInt(longestTrip.trip_time_in_secs, 10);

    // To test with just one trip
    // TRIPS = TRIPS.slice(0, 1);

    _.each(TRIPS, function (trip) {
      
      var getFloat = function (key) {
        return parseFloat(trip[key]);
      };

      var pathCoordinates = [
        new google.maps.LatLng(getFloat('pickup_latitude'), getFloat('pickup_longitude')),
        new google.maps.LatLng(getFloat('dropoff_latitude'), getFloat('dropoff_longitude'))
      ];

      var symbol = {
        path: google.maps.SymbolPath.FORWARD_OPEN_ARROW,
        scale: 2,
        fillColor: 'red',
        fillOpacity: 1,
        strokeOpacity: 0
      };

      var path = new google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        icons: [{
          icon: symbol,
          offset: "100%"
        }],
        strokeOpacity: .3,
        strokeColor: '#D788A9',
        strokeWeight: 1,
        map: map
      });

      var tripTime = parseInt(trip['trip_time_in_secs'], 10);
      animateSymbol(path, tripTime);

    });

    function animateSymbol(line, tripTime) {
        var count = 0, bit = 100;

        var interval = window.setInterval(function() {
          count = count + bit;
          percent = count < tripTime ? (count / tripTime) * 100 : 100;

          var icons = line.get('icons');
          icons[0].offset = percent + '%';
          line.set('icons', icons);

          if (percent === 100) clearInterval(interval);
        }, bit);
    }

  });

  new Dragdealer('slider', {
    steps: 11,
    snap: true,
    slide: false,
    callback: function (x, y) {
      var handle = document.querySelector('#slider .handle');
      handle.innerHTML = x * 10;
    }
  });

}
