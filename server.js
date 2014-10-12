var fs = require('fs')
  , express = require('express')
  , polyline = require('polyline')
  , sqlite3 = require('sqlite3');

var app = express()
  , port = process.env.PORT || 8000
  , db = new sqlite3.Database('test.db');

var featureCollection = {
  type: "FeatureCollection",
  features: []
};

var router = express.Router();

app.use(express.static(__dirname + '/public'));

app.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  next();
});

router.get('/trip', function (req, res, next) {
  var query = 'select * from `trips` limit 1';

  db.serialize(function () {
    db.get(query, function (err, result) {
      if (err) { console.log(err); }
      createGeojson(result, function (geojson) {
        res.json(geojson);
      });
    });
  });
});

app.use('/', router);
app.listen(port);
console.log('Listening on port ' + port);


function createGeojson(rawData, callback) {

  featureCollection.features = [];

  var feature = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: []
    }
  };

  feature.geometry.coordinates.push(
    [rawData.pickup_latitude, rawData.pickup_longitude],
    [rawData.dropoff_latitude, rawData.dropoff_longitude]
  );

  featureCollection.features.push(feature);

  callback(coordinates);
}
