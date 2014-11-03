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
      pickupTime: getNYCTime(trip.pickupTime),
      duration: trip.duration
    },
    geometry: {
      type: 'LineString',
      coordinates: polylineDecode(trip.direction)
    }
  }
}
// End Map and SVG }}}

// Graph {{{
var tickValues = [
  '11-16', '11-21', '11-26', '12-01', '12-05',
  '12-11', '12-16', '12-21', '12-26', '12-31'
]

function initGraph () {
  var $graph = $('.graph')
    , width = $graph.width() - 60
    , height = $graph.height() - 40;

  var data = tripsPerDate;
  var x = d3.scale.ordinal()
    .domain(data.map(function (d) { return d[0]; }))
    .rangeBands([0, width]);
  var y = d3.scale.linear()
    .domain([0, d3.max(data, function (d) { return d[1]; })])
    .range([height, 0]);

  var xAxis = d3.svg.axis()
    .scale(x).orient('bottom')
    .tickValues(tickValues);
  var yAxis = d3.svg.axis()
    .scale(y).orient('left').ticks(6);

  var chart = d3.select('.chart').attr({
    width: width + 60, height: height + 40
  }).append('g');

  chart.append('g').attr('class', 'x axis')
    .attr('transform', 'translate(40,' + (height + 20) + ')')
    .call(xAxis);
  chart.append('g').attr('class', 'y axis')
    .attr('transform', 'translate(40, 20)')
    .call(yAxis);

  var barWidth = x.rangeBand() / 3
    , barOffset = 40 + barWidth;
  chart.selectAll('.bar').data(data)
    .enter().append('rect')
    .attr('class', function (d) { return 'bar ' + d[0]; })
    .attr('x', function (d) { return barOffset + x(d[0]); })
    .attr('width', barWidth)
    .attr('y', function (d) { return y(d[1]) + 20; })
    .attr('height', function (d) { return height - y(d[1]); });
}
// End Graph }}}

// Time and Counts {{{
var time, timeFactor = 10
  , timer = setTimeout(function () {}, 1)
  , queryTime
  , counts = {};

function updateTimer () {
  time.add(1, 'minutes');
  $('.date').text(time.format('dddd, MMM DD'));
  $('.time').text(time.format('hh:mm a'));
  timer = setTimeout(updateTimer, (1000 / timeFactor));
}

function adjustTimer (startTime) {
  startTime = moment(startTime).zone('-05:00');
  if (!time.isBefore(startTime)) {
    time = startTime;
    clearTimeout(timer);
    updateTimer();
  }
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
  if (resultCount === 0) { getNextChunk(); return; }

  var startTime = getNYCTime(rawData[0].pickupTime)
    , totalPaths = rawData.length, drawn = 0
    , halfKey = Math.floor(totalPaths / 2);

  var data = {
    type: 'FeatureCollection',
    features: _.map(rawData, getLineFeature)
  };

  var feature = g.selectAll('path')
    .data(data.features)
    .enter().append('path')
    .attr('class', function (d) {
      return d.properties.terminal;
    });

  // var pkey = rawData[0].pickupTime.slice(11, 16);
  reset();

  adjustTimer(startTime);
  $('.bar.'+ time.format('MM-DD')).css({opacity: .8, fill: 'steelblue'});

  g.selectAll('path').each(pathTransition);

  function pathTransition (d) {
    var path = this;

    var l = path.getTotalLength()
      , endPoint = path.getPointAtLength(l)
      , pickup = d.properties.pickupTime
      , delay = (pickup - time) / (60 * timeFactor);

    var marker = g.append('circle')
      .attr({r: 2, cx: endPoint.x, cy: endPoint.y})
      .datum(pointToLatLon(endPoint));

    d3.select(path)
      .transition()
      .delay(delay)
      .duration(function (d) {
        var duration = d.properties.duration;
        return duration * 1000 / ( 60 * timeFactor);
      })
      .each('start', function (d) {
        this.style.opacity = .8;
        time = moment(d.properties.pickup).zone('-05:00');
        if (d.properties.key === halfKey) {
          getNextChunk();
        }
      })
      .each('end', function (d) {
        var terminal = d.properties.terminal;
        updateCounts(terminal);

        marker.attr('class', terminal).transition()
          .duration(4000).style('opacity', 0);

        d3.select(this).transition().duration(500)
          .style('opacity', 0).remove();

        drawn = drawn + 1;
        if (drawn === resultCount) { feature = null; }
      })
      .attrTween('stroke-dasharray', function () {
        return d3.interpolateString('0,' + l, l + ',' + l);
      })
  }

  map.on('viewreset', onViewReset);

  function reset () {
    var bounds = d3path.bounds(data)
      , x = bounds[0][0] , y = bounds[0][1]
      , dx = bounds[1][0], dy = bounds[1][1];

    svg.attr({width: dx - x, height: dy - y})
      .style({left: x + 'px', top: y + 'px'})
    g.attr("transform", "translate(" + -x + "," + -y+ ")");
    feature.attr('d', d3path)
  }

  function onViewReset () {
    g.selectAll('circle').each(translatePoint)
    if (feature) feature.attr('d', d3path);
  }
}
// End Animation and Markers }}}

// Fetching data {{{
var QF = 'YYYY-MM-DD HH:mm:ss'  // query format
  , activeTerminals = []
  , allTerminals = getTerminals('.terminals input')
  , TQ = { startDate: null, endDate: null, currentStart: null }
  , dataCache = {};

function getTerminals (selector) {
  return $(selector).map(function () {
    return this.value;
  }).get();
}

function getNextChunk () {
  if (TQ.currentStart >= TQ.endDate) {
    clearTimeout(timer);
    return;
  }
  var current = moment(TQ.currentStart)
    , start = current.format(QF)
    , end = current.add(2, 'hours').format(QF);
  TQ.currentStart = end;

  prefetchData();
  $.when(dataCache[start]).then(animatePaths);
}

function getData (query) {
  var key = query.startDate;
  if ( !(key in dataCache) ) {
    dataCache[key] = $.getJSON('/trip?', query);
  }
}

function createQuery () {
  activeTerminals = getTerminals('.terminals input:checked');
  TQ.startDate = $('#startDate').val() + ' 00:00:00';
  TQ.endDate = $('#endDate').val() + ' 00:00:00';
  TQ.currentStart = TQ.startDate;
}

function prefetchData () {
  var first = moment(TQ.currentStart);
  _.each(_.range(8), function () {
    getData({
      startDate: first.format(QF),
      endDate: first.add(2, 'hours').format(QF)
    });
  });
}

function backgroundStart () {
  createQuery();
  queryTime = new Date();
  time = moment(getNYCTime(TQ.startDate)).zone('-05:00')

  // Clear counts. Hide/show stats as required
  _.each(allTerminals, function (t) { counts[t] = 0; });
  $('.tcount').html('0');

  checkboxToggled();
  prefetchData();
}
// End Fetching data }}}

// jQuery events {{{
function checkboxToggled () {
  $('.terminals .checkbox').each(function () {
    var $input = $('input', this);
    var disabled = !$input.is(':checked');
    $(this).toggleClass('striked', disabled);
    $('#map').toggleClass($input.val() + '-hide', disabled);
  });
}
  
function initEvents () {

  $('.speed').click(function () {
    var speed = $(this).data('speed');
    timeFactor = parseInt(speed, 10);
  });

  // Show countries/airlines when user hovers on terminal
  $('.terminals .checkbox').hover(function () {
    var termClass = $('input', this).val();
    $('.airlines > div').hide();
    $('.airlines > div.t-' + termClass).show();
    $('.airlines').show();
  }, function () {
    $('.airlines').hide();
  });

  $('.terminals .checkbox input').change(checkboxToggled);

}
// End jQuery events }}}

// Document ready {{{
$(function () {
  initMap();
  initSVG();
  initEvents();
  initGraph();

  $('.checkbox input').attr('checked', 'checked');

  backgroundStart();

  $('#begin').click(function () {
    $('.overlay').hide();
    getNextChunk();
  });
});
// End document ready }}}
