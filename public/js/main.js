// Utility functions {{{

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

// End utility functions }}}

// Map and SVG {{{
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
      pickupTime: trip.pickupTime,
      duration: trip.duration
    },
    geometry: {
      type: 'LineString',
      coordinates: _.map(coordinates, function (c) {
        return [c[1], c[0]];
      })
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
  $('.readableTime').text(time.format('hh:mm a'));
  $('.date').text(time.format('DD'));
  $('.month').text(time.format('MMM'));
  timer = setTimeout(function () { updateTimer(); }, (1000 / timeFactor));
}

function updateCounts (props) {
  var t = props.terminal
    , countId = '#count-' + t.replace(' ', '-');
  counts[t]++;
  $(countId).text(counts[t]);
}
// End time and counts }}}

// Animation and markers {{{
function animatePaths (rawData) {
  var resultCount = rawData.length , drawn = 0;
  g.selectAll('path').remove();
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
    var marker = g.append('circle').attr({r: 2, 'class': airport});

    d3.select(path)
      .transition()
      .duration(function (d) {
        var duration = d.properties.duration;
        return duration * 1000 / ( 60 * timeFactor);
      })
      .each('start', function (d) {
        d3.select(this).style('opacity', .8);
      })
      .each('end', function (d) {
        d3.select(this).remove();
        marker.attr('done', 'yes').datum(function (d) {
          return coordToLatLon([d.x, d.y]);
        });
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
          marker.datum(p);
          return i(t);
        };
      });
  }

  map.off('viewreset');
  map.on('viewreset', onViewReset);
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

  function onViewReset () {
    reset();  // Shift cirlces to correct latLng as well
    g.selectAll('circle[done]').attr('transform', function (d) {
      return translatePoint([d.lng, d.lat]);
    });
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
    , end = current.add(1, 'hours').format(QF);
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

  // Clear all existing paths, circles, timeouts
  queryTime = new Date();
  g.selectAll('path').transition(0);
  g.selectAll('circle').remove();

  // Clear counts. Hide/show stats as required
  _.each(allTerminals, function (t) { counts[t] = 0; });
  $('.tcount').html('0');

  $('.terminals .checkbox').each(function () {
    var checked = $('input', this).is(':checked');
    $(this).toggleClass('striked', checked);
  });
  
  fetchNextChunk();
  return false;  // for form.submit
}
// End Fetching data }}}

// jQuery events {{{
function initEvents () {

  $('.input-daterange').datepicker({
    format: 'yyyy-mm-dd',
    startDate: '2013-11-15',
    endDate: '2013-12-31'
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

// document ready {{{
$(function () {

  initMap();
  initSVG();
  initEvents();
  setTimeout(runNewQuery, 500);

});
// End document ready }}}
