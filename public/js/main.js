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

var TERMINAL_COLORS = {
  'JFK': '#3f9',
  'LGA': '#fc0',
  'EWR': '#099',
}

var polylines = [];

function updateQuery () {

  _.each(polylines, function (l) {
    map.removeLayer(l);
  });

  d3.json('/trip', function (data) {
    var options =  {weight: 2, opacity: .8}

    _.each(data, function (trip) {
      options.color = getLineColor(trip.terminal);
      var polyline = L.Polyline.fromEncoded(trip.direction, options).addTo(map);
      polylines.push(polyline);
    });

    function getLineColor(terminal) {
      return TERMINAL_COLORS[terminal.substring(0, 3)];
    }

    /*
    var feature = g.selectAll('path')
      .data(data.features)
      .enter().append('path');

    var pointsArray = [];
    var points = g.selectAll('.point')
      .data(pointsArray);

    var marker = g.append('circle');
    marker.attr('r', 5).attr('id', 'marker');

    function iterate() {
      var path = svg.select('path.trip' + i)
        .attr('style', 'opacity:.7')
        .call(transition);

      function pathStartPoint(path) {
        var d = path.attr('d');
        dsplitted = d.split('L')[0].slice(1).split(',');
        return [parseInt(dsplitted[0]), parseInt(dsplitted[1])];
      }

      var startPoint = pathStartPoint(path);
      marker.attr('transform', 'translate(' + startPoint[0] + ',' + startPoint[1] + ')');

    }

    function transition(path) {
      g.selectAll
      path.transition()
        .duration(function (d) {
          var start = Date.parse(d.properties.pickup_datetime)
            , finish = Date.parse(d.properties.dropofftime)
            , duration = (finish - start) / 60000;

          duration = duratinon / timeFactor * 1000
          return (duration);
        })
        .attrTween('stroke-dasharray', tweenDash);
    }

    function tweenDash(d) {
      var l = path.node().getTotalLength();
      var i = d3.interpolateString('0,' + l, l + ',' + l);
      return function (t) {
        var marker = d3.select('#marker');
        var p = path.node().getPointAtLength(t * l);
        marker.attr('transform', 'translate(' + p.x + ',' + p.y + ')');
        if (tweenToggle == 0) {
          tweenToggle = 1;
          var newCenter = map.layerPointToLatLng(new L.Point(p.x, p.y));
        } else {
          tweenToggle = 0;
        }
        return i(t);
      };
    }


    map.on('viewreset', reset);
    reset();

    function reset() {
      var bounds = d3path.bounds(data);
      topLeft = bounds[0],
      bottomRight = bounds[1];

      svg.attr("width", bottomRight[0] - topLeft[0] + 100)
      .attr("height", bottomRight[1] - topLeft[1] + 100)
      .style("left", topLeft[0]-50 + "px")
      .style("top", topLeft[1]-50 + "px");

      g.attr("transform", "translate(" + (-topLeft[0]+50) + "," + (-topLeft[1]+50)+ ")");

      feature.attr("d", d3path);

      //TODO: Figure out why this doesn't work as points.attr...
      g.selectAll(".point")
      .attr("transform",function(d){
        return translatePoint(d);
      });
    }
    */
  });

}

updateQuery();

$(function () {

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
      updateQuery();
    } else {
      $(this).css('color', '#d33030');
    }
  });

});
