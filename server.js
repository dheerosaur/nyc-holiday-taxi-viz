var express = require('express')
  , polyline = require('./polyline.js')
  , sql = require('sql')
  , sqlite3 = require('sqlite3')
  , _ = require('underscore');

var app = express()
  , port = process.env.PORT || 8000
  , router = express.Router()
  , db = new sqlite3.Database('db');

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
      createGeojson(result, function (features) {
        res.json(features);
      });
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

function getNYCTime (s) {
  var formatted = s.replace(' ', 'T') + '-05:00';
  return new Date(formatted);
}

function createGeojson(rawData, callback) {
  var features = {};
  var bounds = {minLats: [], maxLats: [], minLngs: [], maxLngs: []};
  var batchStart = rawData[0].pickupTime.replace(/[ :]/g, '-');

  for (var i=0; i < rawData.length; i++) {
    var trip = rawData[i];
    var decoded = polyline.decode(trip.direction);
    bounds.minLats.push(decoded.bounds.minLat);
    bounds.maxLats.push(decoded.bounds.maxLat);
    bounds.minLngs.push(decoded.bounds.minLng);
    bounds.maxLngs.push(decoded.bounds.maxLng);

    var pickupTime = trip.pickupTime;
    if ( !(pickupTime in features) ) features[pickupTime] = [];

    features[pickupTime].push({
      type: 'Feature',
      properties: {
        key: i,
        batchStart: batchStart,
        end: decoded.end,
        terminal: trip.terminal,
        duration: trip.duration,
        pickupTime: trip.pickupTime
      },
      geometry: {
        type: 'LineString',
        coordinates: decoded.coordinates
      }
    });
  }

  var mapBounds = {
    minLat: Math.min.apply(null, bounds.minLats),
    maxLat: Math.max.apply(null, bounds.maxLats),
    minLng: Math.min.apply(null, bounds.minLngs),
    maxLng: Math.max.apply(null, bounds.maxLngs)
  };

  var response = {
    features: features,
    mapBounds: mapBounds,
    batchStart: batchStart
  };

  callback(response);
}
