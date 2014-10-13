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
  var sql = buildQuery(req.query);

  db.serialize(function () {
    db.all(sql, function (err, result) {
      if (err) { console.log(err); }
      res.json(result);
    });
  });
});

app.use('/', router);
app.listen(port);
console.log('Listening on port ' + port);

function buildQuery(params) {
  var fields = ['vendor_id', 'passenger_count', 'direction', 'terminal'];
  var sql = 'select ' + fields.join() + ' from `trips`';
  if ( !_.isEmpty(params) ) {
    var conditions = _.map(_.pairs(params), function (x) {
      return x[0] + '="' + x[1] + '"';
    });
    sql = sql + ' WHERE ' + conditions;
  }
  console.log(sql);
  return sql;
}

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
