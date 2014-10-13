var fs = require('fs')
  , express = require('express')
  , polyline = require('polyline')
  , sqlite3 = require('sqlite3')
  , _ = require('underscore');

var app = express()
  , port = process.env.PORT || 8000
  , db = new sqlite3.Database('db');

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
  var fields = ['vendor_id', 'passenger_count', 'direction', 'terminal'];
  var query = 'select ' + fields.join() + ' from `trips`';

  db.serialize(function () {
    db.all(query, function (err, result) {
      if (err) { console.log(err); }
      res.json(result);
    });
  });
});

app.use('/', router);
app.listen(port);
console.log('Listening on port ' + port);

function createGeojson(rawData, callback) {

  featureCollection.features = [];

  _.each(rawData, function (row) {
    var feature = {
      type: 'Feature',
      properties: {
      },
      geometry: {
        type: 'LineString',
      }
    };

    feature.geometry.coordinates = polyline.decode(row.direction);
    featureCollection.features.push(feature);
  });

  callback(featureCollection);
}
