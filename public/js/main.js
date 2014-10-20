var map = L.map('map', {zoomControl: false}).setView([40.708, -73.954], 12);

var TOKEN = '?access_token=pk.eyJ1IjoiZGhlZXJvc2F1ciIsImEiOiJKdHQ2TTJZIn0.qlhdcUlB-i7vnDaXgkNxhw'
  , MAPID = 'dheerosaur.jo9f69e5'

L.tileLayer('http://{s}.tiles.mapbox.com/v4/' + MAPID + '/{z}/{x}/{y}.png' + TOKEN, {
  attribution: 'Copyright',
  maxZoom: 18,
}).addTo(map);

L.control.zoom({ position: 'topright' }).addTo(map);


var svg = d3.select(map.getPanes().overlayPane).append("svg")
  , g = svg.append("g").attr("class", "leaflet-zoom-hide");

function translatePoint(d) {
    var point = map.latLngToLayerPoint(new L.LatLng(d[1],d[0]));  
    return "translate(" + point.x + "," + point.y + ")";
}

function projectPoint (x, y) {
  var point = map.latLngToLayerPoint(new L.LatLng(y, x));
  this.stream.point(point.x, point.y);
}

var transform = d3.geo.transform({ point: projectPoint })
  , d3path = d3.geo.path().projection(transform);

var options =  {weight: 2, opacity: .8}

function getLineFeature (trip, index) {
  var coordinates = L.PolylineUtil.decode(trip.direction);
  return {
    type: 'Feature',
    properties: {
      key: index,
      terminal: trip.terminal,
      passenters: trip.passenger_count,
      pickupTime: trip.pickup_datetime,
      dropoffTime: trip.dropoff_datetime,
      duration: trip.trip_time_in_secs
    },
    geometry: {
      type: 'LineString',
      coordinates: _.map(coordinates, function (c) {
        return [c[1], c[0]];
      })
    }
  }
}

function updateQuery (query) {
  if (_.isUndefined(query)) query = {};
  var url = '/trip?' + $.param(query);
  
  var startDate = getNYCTime(query.startDate)
    , endDate = getNYCTime(query.endDate);

  d3.json(url, function (rawData) {

    var data = {
      type: 'FeatureCollection',
      features: _.map(rawData, getLineFeature)
    };

    g.selectAll('path').remove();

    var feature = g.selectAll('path')
      .data(data.features)
      .enter().append('path')
      .style('opacity', 0)
      .attr('class', function (d) {
        return ('trip-' + d.properties.key) + ' ' +
               ('from-' + d.properties.terminal.slice(0, 3));
      });

    function transition (d, i) {
      var tl = this.getTotalLength();
      d3.select(this)
        .attr('stroke-dasharray', tl + ' ' + tl)
        .attr('stroke-dashoffset', tl)
        .style('opacity', .8)
        .transition()
        .duration(function (d) {
          var duration = d.properties.duration;
          return duration * 20;
        })
        .attr('stroke-dashoffset', 0)
        .each('end', function () {
        });
    }

    //setTimeout(function () {
      //g.selectAll('path').each(transition);
    //}, 1);

    g.selectAll('path').each(function (d, i) {
      var path = this
        , pickup = getNYCTime(d.properties.pickupTime)
        , after = (pickup - startDate) / 5000;
      setTimeout(function () {
        transition.call(path, d, i);
      }, after);
    });

    map.on('viewreset', reset);
    reset();

    function reset () {
      var bounds = d3path.bounds(data)
        , topLeft = bounds[0]
        , bottomRight = bounds[1];

      svg.attr("width", bottomRight[0] - topLeft[0] + 100)
        .attr("height", bottomRight[1] - topLeft[1] + 100)
        .style("left", topLeft[0] - 50 + "px")
        .style("top", topLeft[1] - 50 + "px");

      g.attr("transform", "translate(" + (-topLeft[0]+50) + "," + (-topLeft[1]+50)+ ")");

      feature.attr("d", d3path);
    }
  });

}

function getNYCTime (s) {
  var formatted = s.replace(' ', 'T') + '-05:00';
  return new Date(formatted);
}

// updateQuery();

$(function () {
  var startDate = '2013-12-25 00:00:00'
    , endDate = '2013-12-25 02:00:00';

  updateQuery({
    startDate: startDate,
    endDate: endDate
  });

  $('.airports input').change(function () {
    var airport = $(this).val();
    $('.terminals').hide();
    $('.terminals input').removeAttr('checked');
    $('#' + airport + '-terminals').show();
  });

  $('.filters .submit').click(function () {
    var airport = $('input[name=airport]:checked').val()
      , terminal = $('.terminals input:checked').val();
    $(this).css('color', 'black');
    if (airport && terminal) {
      updateQuery({'terminal': airport + ' ' + terminal});
    } else {
      $(this).css('color', '#d33030');
    }
  });

});
