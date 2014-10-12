var map = L.map('map').setView([40.761, -73.968], 11);

var TOKEN = '?access_token=pk.eyJ1IjoiZGhlZXJvc2F1ciIsImEiOiJKdHQ2TTJZIn0.qlhdcUlB-i7vnDaXgkNxhw'
  , MAPID = 'dheerosaur.jo9f69e5'

L.tileLayer('http://{s}.tiles.mapbox.com/v4/' + MAPID + '/{z}/{x}/{y}.png' + TOKEN, {
  attribution: 'Copyright',
  maxZoom: 18
}).addTo(map);
