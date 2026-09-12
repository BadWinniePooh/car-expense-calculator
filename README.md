# Trip Cost Calculator

A small web app that answers one question: **what does this drive actually cost?** Pick a vehicle
class, confirm the price at your pump, enter the distance — get the fuel cost *plus* the share of
ownership that distance consumes.

- **Nothing is sent anywhere.** No database, no backend, no analytics. The page makes no network
  calls at all, and the CSP (`connect-src 'none'`) enforces it rather than merely promising it.
- **Nothing is kept, with one deliberate exception:** a custom car you configure and explicitly
  save. See [Your own car](#your-own-car).
- **No build step and no dependencies.** Plain HTML, CSS and ES modules.

The interface implements a [Claude Design](https://claude.ai/design) artboard: a single dark visual
world, Archivo for the interface and JetBrains Mono for every figure, one blue accent that marks
the current selection and nothing else.

## Running it with Docker

Docker is the only thing you need installed — no Node, no toolchain:

```bash
docker compose up -d        # http://localhost:8080
docker compose down
```

That builds a single-stage image (nginx serving the static files) and runs it as the unprivileged
`nginx` user on port 8080, with a `/healthz` endpoint Compose uses for its health check.

The test suite runs in a container too, so a checkout needs no local Node:

```bash
docker compose run --rm test
```

To change the published port, edit the `ports` mapping in `compose.yaml` — the left-hand number is
the host port (`"3000:8080"` serves it on port 3000).

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
fuel cost   = fuel used × price per unit
upkeep      = distance × (wear + insurance & tax + depreciation) / 100
total       = fuel cost + upkeep
```

Those lines cover combustion and electric cars alike: for an EV, "litres per 100 km" becomes "kWh
per 100 km" and "price per litre" becomes "price per kWh". The unit never enters the arithmetic, so
`src/calc.js` stays unit-agnostic.

**Upkeep** is the cost of owning the car, spread over the distance driven, in cents per kilometre:

| Component         | ADAC line       | What it covers                                  |
| ----------------- | --------------- | ----------------------------------------------- |
| Wear & service    | Werkstattkosten | Inspections, repairs, wear parts, tyres         |
| Insurance & tax   | Fixkosten       | Insurance premiums and vehicle tax              |
| Depreciation      | Wertverlust     | Loss of value — normally the largest block      |

ADAC's fourth line, *Betriebskosten*, is fuel; the app computes that from the live price instead,
so it is deliberately absent from the upkeep table.

## Layout

| Path                 | Purpose                                                          |
| -------------------- | ---------------------------------------------------------------- |
| `index.html`         | The single page                                                  |
| `assets/styles.css`  | The design system — dark only, tokenised                         |
| `src/calc.js`        | Pure cost math — no DOM, no I/O, unit tested                     |
| `src/data.js`        | Vehicle classes, fuel prices and upkeep rates, with sources      |
| `src/profile.js`     | The only persisted state: load, validate and save a custom car   |
| `src/app.js`         | State, rendering and live recalculation                          |
| `test/calc.test.js`  | Tests for the math and for the integrity of the static data      |
| `test/profile.test.js` | Tests for persistence, validation and hostile storage content  |
| `Dockerfile`         | Single-stage nginx image, runs unprivileged on port 8080         |
| `docker/nginx.conf`  | Server block: MIME types, cache policy, security headers         |
| `compose.yaml`       | `web` service, plus a `test` service under the `tools` profile   |

## Vehicle classes

Fourteen classes across two powertrains, switchable at the top of the picker. The default is the
class the app was built around: a **compact petrol estate** in the VW Golf Variant / Hyundai i30
Kombi N-Line bracket at **6.7 l/100 km** — the real-world figure measured for both cars (against
WLTP ratings of 5.8 and 6.3 respectively).

Consumption figures are **real-world**, not WLTP, which runs 5–15 % optimistic. EV consumption is
measured at the charger, so it includes charging losses.

## Your own car

The built-in classes are averages. If you know your own car's figures, press **+ my car**, fill in
its consumption and its three upkeep rates, and save. It appears in the card grid alongside the
built-in classes, marked `your car`, and is selected automatically when the page next loads.

It is stored in `localStorage`, which means:

- **on this device and this browser only** — it does not sync, and it never leaves the machine;
- it survives closing the tab, and the "nothing is stored" badge in the header changes to
  **"1 car saved here"** so the page never claims more privacy than it delivers. Clicking that
  badge reopens the car for editing, and **Forget this car** removes it.

Depreciation is the figure worth thinking about. The built-in rates assume a *new* car losing value
over five years; if yours is paid off, set depreciation to `0` and the estimate drops to fuel plus
running costs. That is a legitimate configuration and the validator allows it.

Storage is treated as untrusted input. Anything read back is validated against the fuel list and a
set of plausibility bounds before it reaches the app — a hand-edited entry, a value from a future
schema version, or plain junk is discarded rather than guessed at, and the app falls back to the
built-in default. Private-browsing modes that throw on storage access are handled too: the app
stays fully usable, it just cannot remember anything.

## Data research

### Is there a public API for current fuel prices or per-model consumption?

**No — not one this app can use.** Findings:

- **[Tankerkönig](https://creativecommons.tankerkoenig.de/)** is the best German fuel-price source:
  it republishes the prices all ~14,000 German stations must report to the Bundeskartellamt
  (MTS-K), under CC BY 4.0, free. But it **requires a personal API key**, which a purely
  client-side app cannot hold without exposing it, and its terms ask callers to poll at most every
  5 minutes. It is also station-based (`prices.php?apikey=…&ids=…`), not a national average — using
  it would mean asking the user for a location first.
- **EU Weekly Oil Bulletin** (European Commission, DG Energy) publishes weekly national averages
  for all EU states as open data. The right *dataset*, but it ships as spreadsheet downloads; the
  JSON wrappers around it are third-party, mostly key-gated or paid.
- **Consumption per model** (Auto-Data, EEA, Spritmonitor) has no free public API either.
  Spritmonitor has the best real-world data, as web pages only.

So the app ships researched static defaults, and — this being the core of the request anyway —
every number is an input the user overwrites.

### Defaults shipped

Prices, Germany, **12 September 2026**:

| Fuel        | Default       | Source                                                     |
| ----------- | ------------- | ---------------------------------------------------------- |
| Petrol      | 2.183 €/l     | ADAC federal average, 12 Sept 2026 (Super E10)             |
| Diesel      | 2.232 €/l     | ADAC federal average, 12 Sept 2026                         |
| Electricity | 0.311 €/kWh   | German household rate, existing contracts, Sept 2026       |

German fuel prices moved sharply through 2026 — E10 monthly averages ran from 1.739 € in January
to 2.109 € in April — so treat the defaults as a starting point and enter the current price.

Public DC fast charging runs 0.55–0.75 €/kWh in 2026; the electricity default is home charging, so
raise it if you charge on the road.

CO₂ factors are 2.33 kg/l petrol and 2.64 kg/l diesel (tailpipe). For EVs the figure is generation
emissions at the German grid mix, ~0.363 kg/kWh — not something coming out of the car.

### Upkeep rates

Upkeep is on the **ADAC basis of a new car held five years at 15,000 km a year** — so 1,250 km a
month, which makes a €100/month line item 8 ct/km. Rates are class averages derived from ADAC's
published per-month cost splits.

Spot checks against ADAC figures:

- **Golf Variant R 4MOTION DSG**: €100 workshop, €170 fixed, €643 depreciation per month → 8.0 /
  13.6 / 51.4 ct/km, which is the "hot hatch / sports" row almost exactly.
- **VW Golf 1.5 eTSI** total running cost 50.5 ct/km and **Golf 2.0 TDI** 53.8 ct/km (ADAC, at
  2020 fuel prices) against this app's compact hatchback at 38.1 ct/km upkeep plus fuel.
- **BEVs** run 35–55 ct/km all-in per ADAC 2026, pay no Kfz-Steuer, and average about a third less
  in workshop costs than comparable combustion cars — which is how the EV rows are shaped.

Depreciation dominates every row, and it is the figure that varies most with how you actually buy
a car. If you drive a paid-off older vehicle, your real cost is far closer to the fuel line alone.

### Sources

- [ADAC: fuel price development](https://www.adac.de/verkehr/tanken-kraftstoff-antrieb/deutschland/kraftstoffpreisentwicklung/)
  and the ADAC press releases on [April 2026](https://presse.adac.de/meldungen/adac-ev/verkehr/rekord-bei-spritpreisen-im-april.html)
  and [March 2026](https://presse.adac.de/meldungen/adac-ev/verkehr/diesel-im-maerz-2026-im-durchschnitt-so-teuer-wie-noch-nie.html)
  monthly averages
- [ADAC Autokosten: cost overview for all models](https://www.adac.de/rund-ums-fahrzeug/auto-kaufen-verkaufen/autokosten/uebersicht/)
  and the [electric vs. combustion cost comparison](https://www.adac.de/rund-ums-fahrzeug/auto-kaufen-verkaufen/autokosten/elektroauto-kostenvergleich/)
- [ADAC: VW ID.3 cheaper than a combustion Golf](https://presse.adac.de/meldungen/adac-ev/technik/vw-id3-guenstiger-als-golf-mit-verbrenner.html)
  (the 5-year / 15,000 km basis, and full-cost figures per model)
- [Tankerkönig API](https://creativecommons.tankerkoenig.de/) (MTS-K data, CC BY 4.0)
- [European Commission: Weekly Oil Bulletin](https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en)
  and the [open dataset](https://data.europa.eu/data/datasets/eu-oil-bulletin?locale=en)
- [auto motor und sport: Hyundai i30 Kombi 1.5 T-GDI N Line — cost and real consumption](https://www.auto-motor-und-sport.de/test/kosten-realverbrauch-hyundai-i30-kombi-1-5-t-gdi-n-line/)
- [auto motor und sport: VW Golf Variant 1.5 eTSI — cost and real consumption](https://www.auto-motor-und-sport.de/test/kosten-realverbrauch-vw-golf-variant-1-5-etsi-r-line/)
- [Spritmonitor: VW Golf, petrol](https://www.spritmonitor.de/en/overview/50-Volkswagen/452-Golf.html?fueltype=2)
  and [Hyundai i30, petrol](https://www.spritmonitor.de/en/overview/19-Hyundai/1046-i30.html?fueltype=2)
- [ADAC: EV charging tariffs 2026](https://www.adac.de/rund-ums-fahrzeug/elektromobilitaet/laden/elektroauto-ladesaeulen-strompreise/)
- [Strom-Report: electricity price development](https://strom-report.com/strompreisentwicklung/)
