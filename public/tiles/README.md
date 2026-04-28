# Offline Map Tiles — ONCLICK

## What goes here

This folder should contain pre-rendered OpenStreetMap (OSM) tile files
to enable the Leaflet map to work with **zero internet connection**.

## Directory Structure

```
public/tiles/
  {z}/          ← zoom level (e.g. 12, 13, 14, 15, 16)
    {x}/        ← tile column
      {y}.png   ← tile image file
```

Example: `public/tiles/15/24412/15178.png`

## How to Generate Tiles

### Option 1 — QGIS (Recommended for Windows)

1. Install [QGIS](https://qgis.org) (free, Windows-compatible)
2. Load an OpenStreetMap layer (via the QuickMapServices plugin)
3. Go to **Processing → Toolbox → Generate XYZ tiles (directory)**
4. Set:
   - Extent: your target city area
   - Zoom levels: 12–16 (recommended for city-level)
   - Output directory: `public/tiles/`
5. Click Run

### Option 2 — `mbtiles-server` + Mobile Atlas Creator

1. Download [Mobile Atlas Creator (MAPC2MAPC)](https://www.mapc2mapc.com/)
2. Select OpenStreetMap as source
3. Choose your area and zoom levels 12–16
4. Export as directory tiles
5. Copy output to `public/tiles/`

## Update Leaflet tile URL

Once tiles are present, update the `tileLayer` URL in:
- `confirm.html` → change `https://{s}.basemaps.cartocdn.com/...` to `/tiles/{z}/{x}/{y}.png`
- `dashboard.html` → same
- `responder.html` → same

Example:
```js
L.tileLayer('/tiles/{z}/{x}/{y}.png', {
  maxZoom: 16,
  minZoom: 12
}).addTo(map);
```

## Estimated Size

| Zoom Levels | City area (~20km²) | Storage |
|-------------|-------------------|---------|
| 12–14       | Quick overview    | ~50 MB  |
| 12–16       | Street detail     | ~400 MB |
| 12–17       | Full detail       | ~2 GB   |

> 💡 For a demo/hackathon, zoom levels 12–15 are sufficient (approx. 80 MB).
