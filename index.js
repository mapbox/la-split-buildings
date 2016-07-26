var tileReduce = require('tile-reduce');
var turf = require('turf');
var path = require('path'),
    join = path.join;

tileReduce({
  bbox: [-118.952, 32.75, -117.646, 34.8233],
  zoom: 12,
  map: join(__dirname, './map.js'),
  sources: [{
    name: 'usa',
    mbtiles: join(__dirname, process.argv[2])
  }]
})
.on('reduce', () => {})
.on('end', () => {});
