var map = L.map('map').setView([40.761, -73.968], 11);

var TOKEN = '?access_token=pk.eyJ1IjoiZGhlZXJvc2F1ciIsImEiOiJKdHQ2TTJZIn0.qlhdcUlB-i7vnDaXgkNxhw'
  , MAPID = 'dheerosaur.jo9f69e5'

L.tileLayer('http://{s}.tiles.mapbox.com/v4/' + MAPID + '/{z}/{x}/{y}.png' + TOKEN, {
  attribution: 'Copyright',
  maxZoom: 18
}).addTo(map);


var svg = d3.select(map.getPanes().overlayPane).append("svg")
  , g = svg.append("g").attr("class", "leaflet-zoom-hide");

d3.json('/trip', function (data) {
  L.polyline(data).addTo(map);
});
