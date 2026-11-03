#!/usr/bin/env python3
"""Independent reference values for the prayer-direction compass (tests/kivun.test.mjs).

Not run in CI (needs: pip install geographiclib pygeomag). Produces verification/kivun-fixtures.json:
  * WGS-84 ellipsoidal geodesic (Karney, geographiclib) initial azimuth + distance from each place to the target;
  * magnetic declination from pygeomag (an independent Python implementation of WMM2025);
  * NOAA's official WMM2025 test values (WMM2025_TestValues.txt, public domain).
Usage: python3 tools/kivun-fixtures.py /path/to/WMM2025_TestValues.txt
"""
import json, sys, os
from geographiclib.geodesic import Geodesic
from pygeomag import GeoMag

TARGET = (31.7780, 35.2354)
PLACES = [  # name, lat, lon  (city coordinates as in site/js/zmanim.js; Sydney: GeoNames 2147714)
    ("telaviv", 32.08088, 34.78057), ("jerusalem", 31.76904, 35.21633), ("newyork", 40.71427, -74.00597),
    ("london", 51.50853, -0.12574), ("moscow", 55.75222, 37.61556), ("sydney", -33.86785, 151.20732),
    ("melbourne", -37.814, 144.96332), ("haifa", 32.81841, 34.9885), ("eilat", 29.55805, 34.94821),
    ("paris", 48.85341, 2.3488), ("crownheights", 40.66899, -73.94291),
]
gm = GeoMag(coefficients_file="wmm/WMM_2025.COF", high_resolution=False)
out = {"target": TARGET, "places": [], "wmmTestValues": []}
for name, lat, lon in PLACES:
    g = Geodesic.WGS84.Inverse(lat, lon, *TARGET)
    out["places"].append({"id": name, "lat": lat, "lon": lon, "azimuth": round(g["azi1"] % 360, 4),
                          "km": round(g["s12"] / 1000, 3),
                          "dec2026_5": round(gm.calculate(glat=lat, glon=lon, alt=0, time=2026.5).d, 3)})
if len(sys.argv) > 1:
    for l in open(sys.argv[1]):
        if not l.strip() or l.startswith("#"): continue
        y, alt, lat, lon, d = map(float, l.split()[:5])
        out["wmmTestValues"].append([y, alt, lat, lon, d])
json.dump(out, open(os.path.join(os.path.dirname(__file__), "..", "verification", "kivun-fixtures.json"), "w"), indent=1)
print("ok", len(out["places"]), len(out["wmmTestValues"]))
