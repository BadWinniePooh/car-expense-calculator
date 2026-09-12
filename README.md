# Trip Cost Calculator

A small web app that estimates what a drive costs: pick a vehicle class, enter the current fuel
price and the distance driven, get the cost.

- **No persistence.** No database, no backend, no `localStorage`, no cookies. Everything happens in
  the browser tab and is gone when you close it.
- **No build step and no dependencies.** Plain HTML, CSS and ES modules.

## Running it with Docker

Docker is the only thing you need installed — no Node, no toolchain:

```bash
docker compose up -d        # http://localhost:8080
docker compose down
```

That builds a single-stage image (nginx serving the static files) and runs it
as the unprivileged `nginx` user on port 8080, with a `/healthz` endpoint
Compose uses for its health check.

The test suite runs in a container too, so a checkout needs no local Node:

```bash
docker compose run --rm test
```

To change the published port, edit the `ports` mapping in `compose.yaml` — the
left-hand number is the host port (`"3000:8080"` serves it on port 3000).

Without Compose:

```bash
docker build -t trip-cost-calculator .
docker run --rm -p 8080:8080 trip-cost-calculator
```

## Running it without Docker

ES modules are blocked over `file://`, so serve the folder over HTTP:

```bash
npm start           # http://localhost:4173  (uses npx serve)
# or
python3 -m http.server 4173
```

Tests (Node's built-in test runner, no dependencies):

```bash
npm test
```

## How the estimate works

```
fuel used   = distance / 100 × consumption per 100 km
total cost  = fuel used × price per unit
```

The same two lines cover combustion and electric cars: for an EV, "litres per 100 km" becomes
"kWh per 100 km" and "price per litre" becomes "price per kWh". The unit never enters the
arithmetic, so `src/calc.js` stays unit-agnostic.

The result is **fuel only** — no wear, tyres, insurance, depreciation or tolls.

## Layout

| Path                 | Purpose                                                          |
| -------------------- | ---------------------------------------------------------------- |
| `index.html`         | The single page                                                  |
| `assets/styles.css`  | Styling, light and dark                                          |
| `src/calc.js`        | Pure cost math — no DOM, no I/O, unit tested                     |
| `src/data.js`        | Static vehicle classes and default fuel prices, with sources     |
| `src/app.js`         | Form wiring, live recalculation, formatting                      |
| `test/calc.test.js`  | Tests for the math and for the integrity of the static data      |
| `Dockerfile`         | Single-stage nginx image, runs unprivileged on port 8080         |
| `docker/nginx.conf`  | Server block: MIME types, cache policy, security headers         |
| `compose.yaml`       | `web` service, plus a `test` service under the `tools` profile   |

## Reference vehicle

The first and default entry is the class the app was built around: a **compact petrol estate** in
the VW Golf Variant / Hyundai i30 Kombi N Line bracket, at **6.7 l/100 km**. That is the
real-world figure measured for both cars — the Golf Variant 1.5 eTSI and the i30 Kombi 1.5 T-GDI
N Line each came out at 6.7 l/100 km against WLTP ratings of 5.8 and 6.3 l/100 km respectively.
Twelve further classes cover small cars, compact hatchbacks, hybrids, mid-size cars, SUVs, vans
and EVs, plus an "enter it yourself" option.

## Data research

### Is there a public API for the current price per 100 km?

**No — not one this app can use.** Findings:

- **[Tankerkönig](https://creativecommons.tankerkoenig.de/)** is the best German fuel-price source:
  it republishes the prices all ~14,000 German stations must report to the Bundeskartellamt
  (MTS-K), under CC BY 4.0, and it is free. But it **requires a personal API key**, which a
  purely client-side app cannot hold without exposing it, and its terms ask callers to poll at
  most every 5 minutes and to bundle stations into one request. It is also station-based
  (`prices.php?apikey=…&ids=…`), not a national average — so using it would mean asking the user
  for a location first.
- **EU Weekly Oil Bulletin** (European Commission, DG Energy) publishes weekly national average
  prices for all EU states as open data. It is the right *dataset*, but it ships as spreadsheet
  downloads; the JSON wrappers around it are third-party, mostly key-gated or paid, and none is a
  stable key-less CORS endpoint.
- **Consumption per model** (Auto-Data, EEA datasets, Spritmonitor) has no free public API either.
  Spritmonitor has the best real-world data but only as web pages.

There is therefore **no free, key-less, CORS-enabled endpoint** that returns either a current
average fuel price or a per-model consumption figure. The app ships researched static defaults
instead, and — this being the core of the request anyway — the price field is an input the user
overwrites with what they actually paid.

Adding Tankerkönig later would be a clean extension: a tiny proxy (or a serverless function)
holding the key, plus a station or postcode picker.

### Static defaults shipped

Default prices, Germany, as of September 2026:

| Fuel                          | Default        | Source                                                          |
| ----------------------------- | -------------- | --------------------------------------------------------------- |
| Super E10                     | 2.145 €/l      | ADAC monthly average, August 2026                               |
| Super E5                      | 2.21 €/l       | Estimated at ~6–7 ct/l above E10 (the usual spread)             |
| Diesel                        | 2.223 €/l      | ADAC monthly average, August 2026                               |
| Electricity, home             | 0.311 €/kWh    | German household rate, existing contracts, September 2026       |
| Electricity, public DC        | 0.65 €/kWh     | Midpoint of typical 2026 DC fast-charging tariffs (0.55–0.75)   |

German fuel prices moved a lot through 2026 (E10 monthly averages ran from 1.739 € in January to
2.109 € in April), so treat the defaults as a starting point and enter the current price.

Consumption defaults are **real-world** averages per vehicle class, not WLTP — WLTP runs roughly
5–15 % optimistic. Each entry in `src/data.js` names the cars it stands for and, where a specific
measurement backs it, carries a note.

### Sources

- [ADAC: fuel price development](https://www.adac.de/verkehr/tanken-kraftstoff-antrieb/deutschland/kraftstoffpreisentwicklung/)
  and the ADAC press releases on [April 2026](https://presse.adac.de/meldungen/adac-ev/verkehr/rekord-bei-spritpreisen-im-april.html)
  and [March 2026](https://presse.adac.de/meldungen/adac-ev/verkehr/diesel-im-maerz-2026-im-durchschnitt-so-teuer-wie-noch-nie.html)
  monthly averages
- [Tankerkönig API](https://creativecommons.tankerkoenig.de/) (MTS-K data, CC BY 4.0)
- [European Commission: Weekly Oil Bulletin](https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en)
  and the [open dataset](https://data.europa.eu/data/datasets/eu-oil-bulletin?locale=en)
- [auto motor und sport: Hyundai i30 Kombi 1.5 T-GDI N Line — cost and real consumption](https://www.auto-motor-und-sport.de/test/kosten-realverbrauch-hyundai-i30-kombi-1-5-t-gdi-n-line/)
- [auto motor und sport: VW Golf Variant 1.5 eTSI — cost and real consumption](https://www.auto-motor-und-sport.de/test/kosten-realverbrauch-vw-golf-variant-1-5-etsi-r-line/)
- [Spritmonitor: VW Golf, petrol](https://www.spritmonitor.de/en/overview/50-Volkswagen/452-Golf.html?fueltype=2)
  and [Hyundai i30, petrol](https://www.spritmonitor.de/en/overview/19-Hyundai/1046-i30.html?fueltype=2)
- [ADAC: EV charging tariffs 2026](https://www.adac.de/rund-ums-fahrzeug/elektromobilitaet/laden/elektroauto-ladesaeulen-strompreise/)
- [Strom-Report: electricity price development](https://strom-report.com/strompreisentwicklung/)
