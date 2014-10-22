/* Utility functions */

  function translatePoint(d) {
    var point = map.latLngToLayerPoint(new L.LatLng(d[1],d[0]));
    return "translate(" + point.x + "," + point.y + ")";
  }

  function coordToLatLon(coord) {
    var point = map.layerPointToLatLng(new L.Point(coord[0], coord[1]));
    return point;
  }

  function projectPoint (x, y) {
    var point = map.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
  }

  function getNYCTime (s) {
    var formatted = s.replace(' ', 'T') + '-05:00';
    return new Date(formatted);
  }

/* End utility functions */

var map, svg, g, transform, d3path;

function initMap () {
  map = L.map('map', {zoomControl: false}).setView([40.708, -73.954], 12);

  var MAP_ROOT = 'http://{s}.tiles.mapbox.com/v4/dheerosaur.jo9f69e5'
    , TOKEN = 'pk.eyJ1IjoiZGhlZXJvc2F1ciIsImEiOiJKdHQ2TTJZIn0.qlhdcUlB-i7vnDaXgkNxhw';

  L.tileLayer(MAP_ROOT + '/{z}/{x}/{y}.png?access_token=' + TOKEN, {
    attribution: 'Copyright',
    maxZoom: 18,
  }).addTo(map);

  L.control.zoom({ position: 'topright' }).addTo(map);
}

function initSVG() {
  svg = d3.select(map.getPanes().overlayPane).append("svg");
  g = svg.append("g").attr("class", "leaflet-zoom-hide");
  transform = d3.geo.transform({ point: projectPoint });
  d3path = d3.geo.path().projection(transform);
}

function getLineFeature (trip, index) {
  var coordinates = L.PolylineUtil.decode(trip.direction);
  return {
    type: 'Feature',
    properties: {
      key: index,
      terminal: trip.terminal,
      passengers: trip.passenger_count,
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

var time = moment()
  , timeFactor = 10
  , timer = setTimeout(function () {}, 1)
  , queryTime
  , counts = {};

function updateTimer () {
  time.add(1, 'minutes');
  $('.readableTime').text(time.format('hh:mm a'));
  $('.date').text(time.format('DD'));
  $('.month').text(time.format('MMM'));
  timer = setTimeout(function () { updateTimer(); }, (1000 / timeFactor));
}

function updateCounts (props) {
  if (_.isEmpty(counts)) return;
  var cls = 'count-' + props.terminal.replace(' ', '-');
  counts[cls]++;
  $('.' + cls).text(counts[cls]);
}

function animatePaths (rawData) {
  var resultCount = rawData.length , drawn = 0;
  g.selectAll('path').remove();
  if (resultCount === 0) return;

  var startTime = getNYCTime(rawData[0].pickup_datetime)
    , totalPaths = rawData.length, drawn = 0;

  time = moment(startTime).zone('-05:00');
  clearTimeout(timer);
  updateTimer();

  var data = {
    type: 'FeatureCollection',
    features: _.map(rawData, getLineFeature)
  };

  var feature = g.selectAll('path')
    .data(data.features)
    .enter().append('path')
    .style('opacity', 0)
    .attr('class', function (d) {
      return ('trip-' + d.properties.key) + ' ' +
             ('from-' + d.properties.terminal.slice(0, 3));
    });

  g.selectAll('path').each(function (d, i) {
    var path = this, lastQueryTime = queryTime
      , pickup = getNYCTime(d.properties.pickupTime)
      , after = (pickup - startTime) / (60 * timeFactor);
    setTimeout(function () {
      if (lastQueryTime !== queryTime) return;
      time = moment(pickup).zone('-05:00');
      pathTransition.call(path, d, i);
    }, after);
  });

  function pathTransition (d, i) {
    var path = this
      , airport = d.properties.terminal.split(' ')[0];
    var marker = g.append('circle').attr({r: 3, 'class': airport});

    d3.select(path)
      .style('opacity', .8)
      .transition()
      .duration(function (d) {
        var duration = d.properties.duration;
        return duration * 1000 / ( 60 * timeFactor);
      })
      .each('end', function (d) {
        d3.select(this).remove();
        updateCounts(d.properties);
        drawn = drawn + 1;
        if (drawn == resultCount) fetchNextChunk();
      })
      .attrTween('stroke-dasharray', function () {
        var l = path.getTotalLength()
          , i = d3.interpolateString('0,' + l, l + ',' + l);
        return function (t) {
          var p = path.getPointAtLength(t * l);
          marker.attr('transform', 'translate(' + p.x + ',' + p.y + ')')
          return i(t);
        };
      });
  }

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
}

// Trips Query
var TQ = {
  terminals: [],
  startDate: null,
  endDate: null,
  currentStart: null
};
var QF = 'YYYY-MM-DD HH:mm:ss';

function fetchNextChunk () {
  clearTimeout(timer);
  if (TQ.currentStart >= TQ.endDate) return;
  var current = moment(TQ.currentStart)
    , start = current.add(24, 'hours').format(QF)
    , end = current.add(24, 'hours').format(QF);
  TQ.currentStart = start;
  fetchData({startDate: start, endDate: end});
}

function fetchData (query) {
  var url = '/trip?' + $.param(query);
  d3.json(url, animatePaths);
}

function createQuery () {
  TQ.terminals = $('#terminals').val();
  TQ.startDate = $('#startDate').val() + ' 00:00:00';
  TQ.endDate = $('#endDate').val() + ' 00:00:00';
  TQ.currentStart = TQ.startDate;
}

function runNewQuery () {
  createQuery();

  // Clear all existing paths, circles, timeouts
  queryTime = new Date();
  g.selectAll('path').transition(0);
  g.selectAll('circle').remove();

  // Clear counts. Hide/show stats as required
  counts = {};
  $('.stats').hide();
  $('.terminal-stats').empty();
  if (TQ.terminals) {
    _.each(TQ.terminals, function (t) {
      var cls = 'count-' + t.replace(' ', '-');
      $('<li>' + t + '<span class="' + cls + '">0</span></li>')
        .appendTo('.terminal-stats');
      counts[cls] = 0;
    });
    $('.stats').show();
  }
  
  fetchNextChunk();
  return false;  // for form.submit
}

function initEvents () {
  $('#terminals').multiselect();

  $('.input-daterange').datepicker({
    format: 'yyyy-mm-dd',
    startDate: '2013-12-20',
    endDate: '2013-12-30'
  });

  $('#form').submit(runNewQuery);

  // Time factor related
  function showTimeFactor () {
    $('.timeFactor').html(timeFactor);
  }

  $('.slower').click(function () {
    if (timeFactor > 1) timeFactor -= 1;
    showTimeFactor();
  });

  $('.faster').click(function () {
    timeFactor += 1;
    showTimeFactor();
  });

  showTimeFactor();
}

$(function () {

  initMap();
  initSVG();
  initEvents();
  setTimeout(runNewQuery, 500);

});
