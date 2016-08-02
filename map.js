'use strict';

var turf = require('turf');
var rbush = require('rbush');
var tilebelt = require('tilebelt');

module.exports = function(tileLayer, tile, writeData, done) {
  var tilebbox = tilebelt.tileToBBOX(tile);
  var tilebboxPolygon = turf.bboxPolygon(tilebbox);
  tilebboxPolygon.geometry.type = 'LineString';
  tilebboxPolygon.geometry.coordinates = tilebboxPolygon.geometry.coordinates[0];
  var buffer = [];
  buffer.push(turf.buffer(tilebboxPolygon, 2, 'meters'));

  var featureCollection = tileLayer.usa.osm;
  var features = featureCollection.features;
  var features = features.filter(f => "lacounty:bld_id" in f.properties);
  var buildings = {},  bboxes = [];

  features.forEach(function(val) {
    var buildingPoints = turf.explode(val);
    var pointsWithin = turf.within(buildingPoints, turf.featureCollection(buffer));

    if (pointsWithin.features.length == 0 && val.geometry.type === 'Polygon' && val.geometry.coordinates.length === 1) {
      var kinks = turf.kinks(val);
      if (kinks.features.length === 0) {
        var bbox = turf.bbox(val);
        var bboxObject = {
          minX: bbox[0],
          minY: bbox[1],
          maxX: bbox[2],
          maxY: bbox[3],
          "@id": val.properties["@id"]
        }
        bboxes.push(bboxObject);
        buildings[val.properties["@id"]] = val;
      }
    }
  });

  var traceTree = rbush(bboxes.length);
  traceTree.load(bboxes);
  var output = Object.create(null);
  bboxes.forEach(function(bbox) {
    var overlaps = traceTree.search(bbox);
    overlaps.forEach(function(overlap) {
      if (overlap["@id"] !== bbox["@id"]) {
        var intersect = turf.intersect(buildings[overlap["@id"]], buildings[bbox["@id"]]);
        if (intersect !== undefined && intersect.geometry.type === 'LineString') {
          var building = buildings[overlap["@id"]];
          if (passesMLA(building)) {
            output[overlap["@id"]] = building;
          }
        }
      }
    });
  });

  var outputFeatures = [];
  for (var key in output) {
    outputFeatures.push(toLineString(output[key]));
  }

  if (outputFeatures.length !== 0) {
    writeData(JSON.stringify(turf.featureCollection(outputFeatures)) + "\n");
  }

  done(null, null);
}

function passesMLA(p) {
  // Area
  p.properties._area = parseFloat((turf.area(p)).toFixed(3));

  // Perimeter
  p.properties._perimeter = parseFloat(((turf.lineDistance(toLineString(p),'kilometers') * 1000)).toFixed(3));

  // Shape
  p.properties._shape = parseFloat(((((Math.PI * 4 * p.properties._area) / ((p.properties._perimeter)*(p.properties._perimeter))) * 100)).toFixed(3));

  // Maning's Learning Algorithm
  return (p.properties._area <= 13 && p.properties._shape <= 76) ||
    (p.properties._area > 13 && p.properties._area <= 30 && p.properties._shape <= 52) ||
    (p.properties._area > 30 && p.properties._shape <= 17);
}

function cloneObject(object) {
  return JSON.parse(JSON.stringify(object));
}

function toLineString(polygon) {
  var ls = cloneObject(polygon);
  ls.geometry.type = 'LineString';
  ls.geometry.coordinates = ls.geometry.coordinates[0];

  return ls;
}
