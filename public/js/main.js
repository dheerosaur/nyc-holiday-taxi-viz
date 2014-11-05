// Utility functions {{{

  function translatePoint(d) {
    var point = map.latLngToLayerPoint(new L.LatLng(d.lat, d.lng));
    this.setAttribute('cx', point.x)
    this.setAttribute('cy', point.y);
  }

  function calculateBounds(b) {
    var topLeft = map.latLngToLayerPoint(new L.LatLng(b.maxLat, b.minLng));
    var bottomRight = map.latLngToLayerPoint(new L.LatLng(b.minLat, b.maxLng));
    return [ topLeft, bottomRight ];
  }

  function pointToLatLon(p) {
    return map.layerPointToLatLng(new L.Point(p.x, p.y));
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
  map = L.map('map', {zoomControl: false});

  //map.setView([40.708, -73.954], 12);
  map.fitBounds([
    [40.869693, -74.170267],
    [40.546460, -73.772013]
  ]);

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
// End Map and SVG }}}

// Graph {{{
var dateTicks = {
  '11-16': 'Nov 16th',
  '11-28': 'Thanks Giving',
  '12-10': 'Dec 10th',
  '12-25': 'Christmas'
}

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
    .tickValues(_.keys(dateTicks))
    .tickFormat(function (t) { return dateTicks[t]; });
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

  var barWidth = x.rangeBand() / 2
    , barOffset = 40 + barWidth;
  chart.selectAll('.bar').data(data)
    .enter().append('rect')
    .each(function (d) {
      var date = d[0], count = d[1];
      d3.select(this).attr({
        'class': 'bar ' + date,
        'x': barOffset + x(date),
        'y': y(count) + 20,
        'width': barWidth,
        'height': height - y(count),
      })
    })
    .on('mouseover', updateTooltip)
    .on('mouseout', clearTooltip);

  var tooltip = d3.select('.graph-tip');

  function clearTooltip () {
    tooltip.html('');
  }

  function updateTooltip (d) {
    var date = d[0], count = d[1]
      , formatted = moment('2013-' + d[0]).format('MMM Do');
    tooltip.html(formatted + ' - Trips: ' + count)
      .style('left', x(date) + 'px');
  }

}
// End Graph }}}

// Time and Counts {{{
var time, queryTime, timer
  , timerStarted = false
  , timeFactor = 20
  , counts = {}
  , allFeatures = {};

function updateTimer () {
  time.add(1, 'minutes');
  $('.date').text(time.format('dddd, MMM DD'));
  $('.time').text(time.format('hh:mm a'));
  var key = time.format(QF)
  if (key in allFeatures) animatePaths(key);
}

function adjustTimer () {
  if (timer) clearInterval(timer);
  timer = setInterval(updateTimer, 1000 / timeFactor);
}

function updateCounts (terminal) {
  var countId = '#count-' + terminal.replace(' ', '-');
  counts[terminal]++;
  $(countId).text(counts[terminal]);
}
// End time and counts }}}

// Animation and markers {{{
var $w = $(window);

function processResponse (response) {
  var svg = d3.select(map.getPanes().overlayPane)
    .append("svg")
    .attr({width: $w.width(), height: $w.height()})

  var g = svg.append("g")
    .attr("class", "leaflet-zoom-hide")
    .attr("id", response.batchStart)

  _.extend(allFeatures, response.features);

  if ( !timerStarted ) {
    adjustTimer();
    timerStarted = true;
  }
}

function animatePaths (key) {
  var features = allFeatures[key];

  if (features.length === 0) { getNextChunk(); return; }

  // Graph highlighting
  $('.bar.'+ time.format('MM-DD')).css('fill', '#fff');

  var g = d3.select(document.getElementById(features[0].properties.batchStart));

  _.each(features, function (feature) {
    feature.geometry.coordinates = polyline.decode(
      feature.geometry.coordinates);
    g.append('path')
      .attr('d', d3path(feature))
      .datum(feature.properties)
      .each(pathTransition);
    if (feature.properties.halfKey) getNextChunk();
  });

  delete allFeatures[key];

  function pathTransition (d) {
    var l = this.getTotalLength()
      , endPoint = this.getPointAtLength(l);

    var marker = g.append('circle')
      .attr({r: 2, cx: endPoint.x, cy: endPoint.y})
      .datum(pointToLatLon(endPoint));

    var duration = d.duration * 1000 / ( 60 * timeFactor); 

    d3.select(this)
      .attr('class', d.terminal)
      .transition()
      .duration(duration)
      .each('start', function (d) {
        this.style.opacity = .8;
      })
      .each('end', function (d) {
        updateCounts(d.terminal);

        marker.attr('class', d.terminal)
          .transition()
          .duration(4000)
          .style('opacity', 0)
          .remove();

        d3.select(this)
          .transition()
          .duration(500)
          .style('opacity', 0)
          .remove();

      })
      .attrTween('stroke-dasharray', function () {
        return d3.interpolateString('0,' + l, l + ',' + l);
      })
  }

  map.on('viewreset', onViewReset);

  function onViewReset () {
    g.selectAll('path').remove();
    g.selectAll('circle').remove();
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
    timer && clearInterval(timer);
    return;
  }
  var current = moment(TQ.currentStart)
    , start = current.format(QF)
    , end = current.add(4, 'hours').format(QF);
  TQ.currentStart = end;

  prefetchData();
  $.when(dataCache[start]).then(processResponse);
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
  _.each(_.range(4), function () {
    getData({
      startDate: first.format(QF),
      endDate: first.add(4, 'hours').format(QF)
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
    if (timerStarted) adjustTimer();

    $('.speed').removeClass('active');
    $(this).addClass('current');
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
    updateTimer();
    getNextChunk();
  });
});
// End document ready }}}
