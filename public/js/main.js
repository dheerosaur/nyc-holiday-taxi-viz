// Utility functions {{{

  function translatePoint(d) {
    var point = map.latLngToLayerPoint(new L.LatLng(d.lat, d.lng));
    this.setAttribute('cx', point.x)
    this.setAttribute('cy', point.y);
  }

  function pointToLatLon(p) {
    var point = map.layerPointToLatLng(new L.Point(p.x, p.y));
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

// End utility functions }}}

// Map and SVG {{{
var map, transform, d3path;

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
  transform = d3.geo.transform({ point: projectPoint });
  d3path = d3.geo.path().projection(transform);
}

function getLineFeature (trip, index) {
  return {
    type: 'Feature',
    properties: {
      key: index,
      terminal: trip.terminal,
      pickupTime: trip.pickupTime,
      duration: trip.duration
    },
    geometry: {
      type: 'LineString',
      coordinates: polylineDecode(trip.direction)
    }
  }
}
// End Map and SVG }}}

// Time and Counts {{{
var time = moment()
  , timeFactor = 10
  , timer = setTimeout(function () {}, 1)
  , queryTime
  , counts = {};

function updateTimer () {
  time.add(1, 'minutes');
  $('.date').text(time.format('dddd, MMM DD'));
  $('.time').text(time.format('hh:mm a'));
  timer = setTimeout(function () { updateTimer(); }, (1000 / timeFactor));
}

function updateCounts (terminal) {
  var countId = '#count-' + terminal.replace(' ', '-');
  counts[terminal]++;
  $(countId).text(counts[terminal]);
}
// End time and counts }}}

// Animation and markers {{{
function animatePaths (rawData) {
  var resultCount = rawData.length , drawn = 0;
  var svg = d3.select(map.getPanes().overlayPane).append("svg");
  var g = svg.append("g").attr("class", "leaflet-zoom-hide");
  if (resultCount === 0) { fetchNextChunk(); return; }

  var startTime = getNYCTime(rawData[0].pickupTime)
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
    .attr('class', function (d) {
      return ('from-' + d.properties.terminal.slice(0, 3));
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
    var path = this, l = path.getTotalLength()
      , airport = d.properties.terminal.slice(0, 3)
      , endPoint = path.getPointAtLength(l);
    var marker = g.append('circle')
      .attr({r: 2, cx: endPoint.x, cy: endPoint.y})
      .datum(pointToLatLon(endPoint));

    d3.select(path)
      .transition()
      .duration(function (d) {
        var duration = d.properties.duration;
        return duration * 1000 / ( 60 * timeFactor);
      })
      .each('start', function (d) {
        this.style.opacity = 0.8;
      })
      .each('end', function (d) {
        var terminal = d.properties.terminal
          , p = path.getPointAtLength(l);
        marker.attr('class', airport);

        d3.select(this).remove();
        updateCounts(terminal);
        drawn = drawn + 1;
        if (drawn == resultCount) fetchNextChunk();
      })
      .attrTween('stroke-dasharray', function () {
        return d3.interpolateString('0,' + l, l + ',' + l);
      });
  }

  map.on('viewreset', onViewReset);
  reset();

  function reset () {
    var bounds = d3path.bounds(data)
      , x = bounds[0][0] , y = bounds[0][1]
      , dx = bounds[1][0], dy = bounds[1][1];

    svg.attr({width: dx - x, height: dy - y})
      .style({left: x, top: y})
    g.attr("transform", "translate(" + -x + "," + -y+ ")");
    feature.attr("d", d3path);
  }

  function onViewReset () {
    g.selectAll('circle').each(translatePoint)
  }
}
// End Animation and Markers }}}

// Fetching data {{{
var TQ = {
  terminals: [],
  startDate: null,
  endDate: null,
  currentStart: null
};
var QF = 'YYYY-MM-DD HH:mm:ss';
var allTerminals = getTerminals('.terminals input');

function getTerminals (selector) {
  return $(selector).map(function () {
    return this.value;
  }).get();
}

function fetchNextChunk () {
  clearTimeout(timer);
  if (TQ.currentStart >= TQ.endDate) return;
  var current = moment(TQ.currentStart)
    , start = current.format(QF)
    , end = current.add(4, 'hours').format(QF);
  TQ.currentStart = end;
  fetchData({startDate: start, endDate: end});
}

function fetchData (query) {
  if (TQ.terminals.length === 0) {
    alert("Please select at least one terminal");
    return;
  }
  query.terminals = TQ.terminals;
  var url = '/trip?' + $.param(query);
  d3.json(url, animatePaths);
}

function createQuery () {
  TQ.terminals = getTerminals('.terminals input:checked');
  TQ.startDate = $('#startDate').val() + ' 00:00:00';
  TQ.endDate = $('#endDate').val() + ' 00:00:00';
  TQ.currentStart = TQ.startDate;
}

function runNewQuery () {
  createQuery();
  queryTime = new Date();

  // Clear counts. Hide/show stats as required
  _.each(allTerminals, function (t) { counts[t] = 0; });
  $('.tcount').html('0');

  $('.terminals .checkbox').each(function () {
    var checked = $('input', this).is(':checked');
    $(this).toggleClass('striked', !checked);
  });
  
  fetchNextChunk();
}
// End Fetching data }}}

// jQuery events {{{
function initEvents () {

  $('.speed').click(function () {
    var speed = $(this).data('speed');
    timeFactor = parseInt(speed, 10);
  });

  // Show countries/airlines when user hovers on terminal
  $('.terminals .checkbox').hover(function () {
    var termClass = $('input', this).val().replace(' ', '-');
    $('.airlines > div').hide();
    $('.airlines > div.t-' + termClass).show();
    $('.airlines').show();
  }, function () {
    $('.airlines').hide();
  });

}
// End jQuery events }}}

// Document ready {{{
$(function () {
  initMap();
  initSVG();
  initEvents();

  $('.checkbox input').attr('checked', 'checked');

  $('#begin').click(function () {
    $('.overlay').hide();
    runNewQuery();
  });
});
// End document ready }}}
