var fs = require('fs')
  , sql = require('sql')
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
  var sql = buildQuery(req.query)
    , queryText = sql.text.replace('SELECT', 'SELECT DISTINCT');

  db.serialize(function () {
    db.all(queryText, sql.values, function (err, result) {
      if (err) { console.log(err); }
      res.json(result);
    });
  });
});

app.use('/', router);
app.listen(port);
console.log('Listening on port ' + port);

var columns = [
    'pickupTime', 'duration', 'terminal', 'direction'
  ]
  , trip = sql.define({name: 'trips', columns: columns})

function buildQuery(params) {
  var query = trip.select(columns);
  if (params.terminals) {
    query.where(trip.terminal.in(params.terminals));
  }
  if (params.startDate) {
    query.where(trip.pickupTime.gte(params.startDate));
  } 
  if (params.endDate) {
    query.where(trip.pickupTime.lte(params.endDate));
  }
  query = query.order(trip.pickupTime);
  return query.toQuery();
}

function createGeojson(rawData, callback) {

  featureCollection.features = [];

  _.each(rawData, function (row, index) {
    var feature = {
      type: 'Feature',
      properties: {
        key: index,
        duration: row.duration
      },
      geometry: {
        type: 'LineString',
      }
    };

    feature.geometry.coordinates = _.map(
      polyline.decode(row.direction),
      function (x) { return [x[1], x[0]]; }
    );
    featureCollection.features.push(feature);
  });

  callback(featureCollection);
}
