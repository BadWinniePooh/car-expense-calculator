/**
 * Static reference data.
 *
 * Why static: there is no free, key-less, CORS-enabled public API that returns
 * an average fuel price or a per-model consumption figure (see README.md,
 * "Data research"). Everything here is therefore a researched default that the
 * user can overwrite in the form — the numbers are a starting point, not a
 * source of truth.
 */

export const DATA_AS_OF = 'September 2026';

/**
 * Fuel/energy types with default unit prices for Germany.
 * Prices are in EUR per `unit`.
 */
export const FUEL_TYPES = {
  e10: {
    label: 'Petrol — Super E10',
    unit: 'l',
    defaultPrice: 2.145,
    source: 'ADAC monthly average for Germany, August 2026 (2.145 €/l)',
  },
  e5: {
    label: 'Petrol — Super E5',
    unit: 'l',
    defaultPrice: 2.21,
    source: 'Estimate: Super E5 typically trades ~6–7 ct/l above E10',
  },
  diesel: {
    label: 'Diesel',
    unit: 'l',
    defaultPrice: 2.223,
    source: 'ADAC monthly average for Germany, August 2026 (2.223 €/l)',
  },
  electricity_home: {
    label: 'Electricity — home charging',
    unit: 'kWh',
    defaultPrice: 0.311,
    source: 'German household electricity, existing contracts, September 2026 (31.1 ct/kWh)',
  },
  electricity_public: {
    label: 'Electricity — public DC fast charging',
    unit: 'kWh',
    defaultPrice: 0.65,
    source: 'Typical German DC fast-charging tariffs 2026 (0.55–0.75 €/kWh), midpoint',
  },
};

/**
 * Vehicle classes with realistic *real-world* consumption (not WLTP, which
 * runs roughly 5–15 % optimistic). Each entry names the cars it stands for.
 *
 * The first entry is the reference vehicle: a compact petrol estate in the
 * VW Golf Variant / Hyundai i30 Kombi N Line class.
 */
export const VEHICLES = [
  {
    id: 'compact-estate-petrol',
    category: 'Compact estate',
    label: 'Compact estate, petrol (~110–120 kW)',
    examples: 'VW Golf Variant 1.5 TSI/eTSI, Hyundai i30 Kombi 1.5 T-GDI N Line, Škoda Octavia Combi 1.5 TSI',
    fuelType: 'e10',
    consumptionPer100Km: 6.7,
    note: 'Real-world test consumption 6.7 l/100 km for both the Golf Variant 1.5 eTSI and the i30 Kombi 1.5 T-GDI N Line (WLTP: 5.8 resp. 6.3 l/100 km).',
  },
  {
    id: 'compact-estate-diesel',
    category: 'Compact estate',
    label: 'Compact estate, diesel',
    examples: 'VW Golf Variant 2.0 TDI, Hyundai i30 Kombi 1.6 CRDi, Škoda Octavia Combi 2.0 TDI',
    fuelType: 'diesel',
    consumptionPer100Km: 5.3,
    note: 'Typical long-term real-world figure for modern compact diesel estates.',
  },
  {
    id: 'small-car-petrol',
    category: 'Small car',
    label: 'Small car, petrol',
    examples: 'VW Polo 1.0 TSI, Renault Clio TCe, Opel Corsa 1.2',
    fuelType: 'e10',
    consumptionPer100Km: 5.8,
  },
  {
    id: 'compact-hatch-petrol',
    category: 'Compact car',
    label: 'Compact hatchback, petrol',
    examples: 'VW Golf 1.5 TSI, Opel Astra 1.2, Ford Focus 1.0 EcoBoost',
    fuelType: 'e10',
    consumptionPer100Km: 6.5,
    note: 'Spritmonitor long-term average across petrol VW Golf variants sits near 6.9 l/100 km.',
  },
  {
    id: 'compact-hybrid',
    category: 'Compact car',
    label: 'Compact full hybrid, petrol',
    examples: 'Toyota Corolla Touring Sports Hybrid, Honda Civic e:HEV, Renault Megane E-Tech Hybrid',
    fuelType: 'e10',
    consumptionPer100Km: 5.0,
  },
  {
    id: 'midsize-petrol',
    category: 'Mid-size car',
    label: 'Mid-size saloon/estate, petrol',
    examples: 'VW Passat 1.5 eTSI, BMW 320i, Mercedes C 200',
    fuelType: 'e10',
    consumptionPer100Km: 7.6,
  },
  {
    id: 'midsize-diesel',
    category: 'Mid-size car',
    label: 'Mid-size saloon/estate, diesel',
    examples: 'VW Passat 2.0 TDI, BMW 320d, Mercedes C 220 d',
    fuelType: 'diesel',
    consumptionPer100Km: 6.0,
  },
  {
    id: 'compact-suv-petrol',
    category: 'SUV',
    label: 'Compact SUV, petrol',
    examples: 'VW Tiguan 1.5 TSI, Hyundai Tucson 1.6 T-GDI, Kia Sportage',
    fuelType: 'e10',
    consumptionPer100Km: 7.9,
  },
  {
    id: 'large-suv-diesel',
    category: 'SUV',
    label: 'Large SUV / van, diesel',
    examples: 'VW Touareg 3.0 TDI, Audi Q7, VW Multivan TDI',
    fuelType: 'diesel',
    consumptionPer100Km: 8.5,
  },
  {
    id: 'van-diesel',
    category: 'Transporter',
    label: 'Transporter / large van, diesel',
    examples: 'Mercedes Sprinter, VW Crafter, Ford Transit',
    fuelType: 'diesel',
    consumptionPer100Km: 9.5,
  },
  {
    id: 'ev-compact',
    category: 'Electric',
    label: 'Compact EV',
    examples: 'VW ID.3, Hyundai Kona Elektro, Renault Megane E-Tech',
    fuelType: 'electricity_home',
    consumptionPer100Km: 18,
    note: 'Consumption is in kWh/100 km, measured at the charger (including charging losses).',
  },
  {
    id: 'ev-suv',
    category: 'Electric',
    label: 'Electric SUV / estate',
    examples: 'VW ID.4, Tesla Model Y, Hyundai Ioniq 5',
    fuelType: 'electricity_home',
    consumptionPer100Km: 20.5,
    note: 'Consumption is in kWh/100 km, measured at the charger (including charging losses).',
  },
  {
    id: 'custom',
    category: 'Other',
    label: 'Other vehicle — enter consumption yourself',
    examples: 'Use the figure from your own trip computer or fuel log',
    fuelType: 'e10',
    consumptionPer100Km: 7.0,
  },
];

export const DEFAULT_VEHICLE_ID = VEHICLES[0].id;

export function getVehicle(id) {
  return VEHICLES.find((vehicle) => vehicle.id === id);
}

export function getFuelType(id) {
  return FUEL_TYPES[id];
}
