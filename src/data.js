/**
 * Static reference data.
 *
 * Why static: there is no free, key-less, CORS-enabled public API that returns
 * an average fuel price or a per-model consumption figure (see README.md,
 * "Data research"). Everything here is a researched default the user can
 * overwrite in the form — a starting point, not a source of truth.
 */

export const DATA_AS_OF = '12 September 2026';

/**
 * Fuel and energy types, with default unit prices for Germany in EUR.
 *
 * `co2PerUnit` is kg CO₂ per unit burned. Petrol and diesel are the standard
 * tailpipe factors; electricity is the German grid mix, so an EV's figure is
 * generation emissions rather than anything coming out of the car.
 */
export const FUELS = {
  petrol: {
    label: 'Petrol',
    unit: 'l',
    defaultPrice: 2.183,
    co2PerUnit: 2.33,
    source: 'ADAC federal average for Germany, 12 September 2026 (Super E10, 2.183 €/l)',
  },
  diesel: {
    label: 'Diesel',
    unit: 'l',
    defaultPrice: 2.232,
    co2PerUnit: 2.64,
    source: 'ADAC federal average for Germany, 12 September 2026 (2.232 €/l)',
  },
  electricity: {
    label: 'Electricity',
    unit: 'kWh',
    defaultPrice: 0.311,
    co2PerUnit: 0.363,
    source:
      'German household electricity, existing contracts, September 2026 (31.1 ct/kWh). Public DC fast charging runs 0.55–0.75 €/kWh. CO₂ is the German grid mix, ~363 g/kWh.',
  },
};

/**
 * Vehicle classes.
 *
 * `cons` is real-world consumption per 100 km — litres for combustion, kWh at
 * the charger for electric — not WLTP, which runs 5–15 % optimistic.
 *
 * `wear`, `fixed` and `dep` are the cost of owning the car, in cents per
 * kilometre, on the ADAC basis of a new car held five years at 15,000 km a
 * year (so 1,250 km a month; a €100/month line item is 8 ct/km):
 *
 *   wear  — Werkstattkosten: inspections, repairs, wear parts, tyres
 *   fixed — Fixkosten: insurance and vehicle tax
 *   dep   — Wertverlust: depreciation, normally the largest block of all
 *
 * ADAC's own Betriebskosten line is fuel, which this app computes from the
 * live price instead, so it is deliberately absent here.
 */
export const VEHICLES = [
  {
    id: 'compact-estate-petrol',
    powertrain: 'combustion',
    name: 'Compact estate',
    examples: 'VW Golf Variant 1.5 TSI, Hyundai i30 Kombi N-Line',
    fuel: 'petrol',
    badge: 'petrol',
    cons: 6.7,
    wear: 5.2,
    fixed: 7.8,
    dep: 27,
    note: 'Real-world test consumption of 6.7 l/100 km for both the Golf Variant 1.5 eTSI and the i30 Kombi 1.5 T-GDI N Line (WLTP: 5.8 resp. 6.3).',
  },
  {
    id: 'compact-estate-diesel',
    powertrain: 'combustion',
    name: 'Compact estate, diesel',
    examples: 'Golf Variant 2.0 TDI, Škoda Octavia Combi TDI',
    fuel: 'diesel',
    badge: 'diesel',
    cons: 5.2,
    wear: 5.8,
    fixed: 9,
    dep: 28,
  },
  {
    id: 'compact-hatch',
    powertrain: 'combustion',
    name: 'Compact hatchback',
    examples: 'VW Golf 1.5 TSI, Ford Focus, Hyundai i30',
    fuel: 'petrol',
    badge: 'petrol',
    cons: 6.4,
    wear: 4.8,
    fixed: 7.3,
    dep: 26,
  },
  {
    id: 'small-car',
    powertrain: 'combustion',
    name: 'Small car',
    examples: 'VW Polo, Toyota Yaris, Opel Corsa 1.2',
    fuel: 'petrol',
    badge: 'petrol',
    cons: 5.7,
    wear: 4.5,
    fixed: 6.5,
    dep: 15,
  },
  {
    id: 'hybrid-estate',
    powertrain: 'combustion',
    name: 'Hybrid estate',
    examples: 'Toyota Corolla Touring Sports HEV',
    fuel: 'petrol',
    badge: 'hybrid',
    cons: 4.8,
    wear: 5,
    fixed: 7.5,
    dep: 24,
  },
  {
    id: 'compact-suv',
    powertrain: 'combustion',
    name: 'Compact SUV',
    examples: 'VW Tiguan, Hyundai Tucson, T-Roc',
    fuel: 'petrol',
    badge: 'petrol',
    cons: 7.8,
    wear: 6,
    fixed: 8.6,
    dep: 32,
  },
  {
    id: 'midsize-diesel',
    powertrain: 'combustion',
    name: 'Midsize estate, diesel',
    examples: 'VW Passat Variant, Škoda Superb 2.0 TDI',
    fuel: 'diesel',
    badge: 'diesel',
    cons: 5.9,
    wear: 6.6,
    fixed: 10,
    dep: 38,
  },
  {
    id: 'large-suv',
    powertrain: 'combustion',
    name: 'Large SUV',
    examples: 'VW Touareg, BMW X5 3.0',
    fuel: 'petrol',
    badge: 'petrol',
    cons: 10.4,
    wear: 9,
    fixed: 14,
    dep: 60,
  },
  {
    id: 'van-diesel',
    powertrain: 'combustion',
    name: 'Van, diesel',
    examples: 'VW Transporter, Mercedes Sprinter',
    fuel: 'diesel',
    badge: 'diesel',
    cons: 9.2,
    wear: 7.5,
    fixed: 11,
    dep: 34,
  },
  {
    id: 'sports',
    powertrain: 'combustion',
    name: 'Hot hatch / sports',
    examples: 'Golf R, BMW M240i',
    fuel: 'petrol',
    badge: 'petrol',
    cons: 9.6,
    wear: 8,
    fixed: 13.6,
    dep: 51,
    note: 'Matches the ADAC split for the Golf Variant R 4MOTION DSG: €100 workshop, €170 fixed, €643 depreciation a month.',
  },

  {
    id: 'ev-small',
    powertrain: 'electric',
    name: 'Small EV',
    examples: 'Fiat 500e, Renault 5 E-Tech, Opel Corsa Electric',
    fuel: 'electricity',
    badge: 'electric',
    cons: 15.5,
    wear: 2.8,
    fixed: 5.2,
    dep: 22,
  },
  {
    id: 'ev-compact',
    powertrain: 'electric',
    name: 'Compact EV',
    examples: 'VW ID.3, Hyundai Kona Elektro, Renault Megane E-Tech',
    fuel: 'electricity',
    badge: 'electric',
    cons: 18,
    wear: 3.2,
    fixed: 6.5,
    dep: 30,
  },
  {
    id: 'ev-suv',
    powertrain: 'electric',
    name: 'Electric SUV / estate',
    examples: 'VW ID.4, Tesla Model Y, Hyundai Ioniq 5',
    fuel: 'electricity',
    badge: 'electric',
    cons: 20.5,
    wear: 3.8,
    fixed: 7.5,
    dep: 38,
  },
  {
    id: 'ev-large',
    powertrain: 'electric',
    name: 'Large EV',
    examples: 'BMW iX, Mercedes EQE SUV, Audi Q6 e-tron',
    fuel: 'electricity',
    badge: 'electric',
    cons: 24,
    wear: 4.5,
    fixed: 9.5,
    dep: 58,
  },
];

export const POWERTRAINS = [
  { id: 'combustion', label: 'Petrol / diesel' },
  { id: 'electric', label: 'Electric' },
];

export const DEFAULT_VEHICLE_ID = VEHICLES[0].id;
export const DISTANCE_PRESETS = [10, 50, 120, 400, 800];
export const PEOPLE_OPTIONS = [1, 2, 3, 4, 5];

export function getVehicle(id) {
  return VEHICLES.find((vehicle) => vehicle.id === id);
}

export function getFuel(id) {
  return FUELS[id];
}

export function vehiclesFor(powertrain) {
  return VEHICLES.filter((vehicle) => vehicle.powertrain === powertrain);
}

/** The ownership rates of a vehicle, in the shape estimateTrip expects. */
export function upkeepOf(vehicle) {
  return { wear: vehicle.wear, fixed: vehicle.fixed, depreciation: vehicle.dep };
}
