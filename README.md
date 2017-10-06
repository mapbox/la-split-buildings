# la-split-buildings - Detect and fix split buildings in LA

More about this project is in this dairy post - https://www.openstreetmap.org/user/manings/diary/39230

**Install dependencies**

`npm install`

`npm install geojson-stream-merge -g`

**Run**

`node index.js input.mbtiles > output.geojson`

`geojson-stream-merge --input output.geojson --output output-merged.geojson`
