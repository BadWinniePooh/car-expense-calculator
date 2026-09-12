import assert from 'node:assert/strict';
import { test } from 'node:test';

import { estimateTrip, fuelUsed, rateCost } from '../src/calc.js';
import {
  DEFAULT_VEHICLE_ID,
  FUELS,
  VEHICLES,
  getFuel,
  getVehicle,
  upkeepOf,
  vehiclesFor,
} from '../src/data.js';

const REFERENCE = { distanceKm: 120, consumptionPer100Km: 6.7, pricePerUnit: 2.183 };
const UPKEEP = { wear: 5.2, fixed: 7.8, depreciation: 27 };

test('fuelUsed scales linearly with distance', () => {
  assert.equal(fuelUsed(100, 6.7), 6.7);
  assert.equal(fuelUsed(50, 6.7), 3.35);
  assert.equal(fuelUsed(0, 6.7), 0);
});

test('rateCost converts cents per km into euros', () => {
  assert.equal(rateCost(100, 40), 40);
  assert.equal(rateCost(120, 27), 32.4);
});

test('fuel-only estimate for the reference compact estate', () => {
  // 120 km at 6.7 l/100 km -> 8.04 l, at 2.183 €/l -> 17.55 €
  const trip = estimateTrip(REFERENCE);

  assert.equal(trip.fuelUsed.toFixed(2), '8.04');
  assert.equal(trip.fuelCost.toFixed(2), '17.55');
  assert.equal(trip.totalCost.toFixed(2), '17.55');
  assert.equal(trip.upkeepCost, 0);
});

test('upkeep adds the ownership share of the distance', () => {
  // 40 ct/km of upkeep over 120 km is 48 €, on top of 17.55 € of fuel.
  const trip = estimateTrip({ ...REFERENCE, upkeep: UPKEEP });

  assert.equal(trip.wearCost.toFixed(2), '6.24');
  assert.equal(trip.fixedCost.toFixed(2), '9.36');
  assert.equal(trip.depreciationCost.toFixed(2), '32.40');
  assert.equal(trip.upkeepCost.toFixed(2), '48.00');
  assert.equal(trip.upkeepRatePerKm, 40);
  assert.equal(trip.totalCost.toFixed(2), '65.55');
});

test('a return trip doubles the distance and everything that scales with it', () => {
  const oneWay = estimateTrip({ ...REFERENCE, upkeep: UPKEEP });
  const both = estimateTrip({ ...REFERENCE, upkeep: UPKEEP, roundTrip: true });

  assert.equal(both.distanceKm, 240);
  assert.equal(both.totalCost.toFixed(2), (oneWay.totalCost * 2).toFixed(2));
  assert.equal(both.fuelUsed.toFixed(3), (oneWay.fuelUsed * 2).toFixed(3));
  // Per-km rates are unchanged by how far you drive.
  assert.equal(both.costPerKm.toFixed(4), oneWay.costPerKm.toFixed(4));
});

test('splitting divides the total but not the per-km rate', () => {
  const trip = estimateTrip({ ...REFERENCE, upkeep: UPKEEP, people: 4 });

  assert.equal(trip.perPerson.toFixed(2), (trip.totalCost / 4).toFixed(2));
  assert.equal(trip.costPerKm.toFixed(4), '0.5463');
});

test('CO₂ follows the fuel burned', () => {
  const trip = estimateTrip({ ...REFERENCE, co2PerUnit: 2.33 });

  assert.equal(trip.co2Kg.toFixed(2), '18.73');
});

test('works unchanged for kWh/100 km and €/kWh', () => {
  const trip = estimateTrip({
    distanceKm: 200,
    consumptionPer100Km: 18,
    pricePerUnit: 0.311,
    upkeep: { wear: 3.2, fixed: 6.5, depreciation: 30 },
  });

  assert.equal(trip.fuelUsed.toFixed(2), '36.00');
  assert.equal(trip.fuelCost.toFixed(2), '11.20');
  assert.equal(trip.upkeepCost.toFixed(2), '79.40');
});

test('per-km figures survive a zero distance', () => {
  const trip = estimateTrip({ ...REFERENCE, distanceKm: 0, upkeep: UPKEEP });

  assert.equal(trip.totalCost, 0);
  assert.equal(trip.fuelUsed, 0);
  assert.equal(Number.isFinite(trip.costPerKm), true);
  assert.equal(trip.costPer100Km.toFixed(2), '54.63');
});

test('rejects non-numeric, negative and fractional-people input', () => {
  assert.throws(() => estimateTrip({ ...REFERENCE, distanceKm: 'far' }), TypeError);
  assert.throws(() => estimateTrip({ ...REFERENCE, distanceKm: NaN }), TypeError);
  assert.throws(() => estimateTrip({ ...REFERENCE, distanceKm: -10 }), RangeError);
  assert.throws(() => estimateTrip({ ...REFERENCE, pricePerUnit: -2 }), RangeError);
  assert.throws(
    () => estimateTrip({ ...REFERENCE, upkeep: { wear: -1, fixed: 0, depreciation: 0 } }),
    RangeError,
  );
  assert.throws(() => estimateTrip({ ...REFERENCE, people: 0 }), RangeError);
  assert.throws(() => estimateTrip({ ...REFERENCE, people: 2.5 }), RangeError);
});

test('the default vehicle is the Golf Variant / i30 Kombi class', () => {
  const reference = getVehicle(DEFAULT_VEHICLE_ID);

  assert.equal(reference.id, 'compact-estate-petrol');
  assert.match(reference.examples, /Golf Variant/);
  assert.match(reference.examples, /i30 Kombi/);
  assert.equal(reference.cons, 6.7);
});

test('every vehicle has usable data and a known fuel', () => {
  const ids = new Set();

  for (const vehicle of VEHICLES) {
    assert.equal(ids.has(vehicle.id), false, `duplicate vehicle id: ${vehicle.id}`);
    ids.add(vehicle.id);

    assert.ok(vehicle.name && vehicle.examples && vehicle.badge);
    assert.ok(vehicle.cons > 0, `${vehicle.id} needs a positive consumption`);
    assert.ok(getFuel(vehicle.fuel), `${vehicle.id} points at an unknown fuel`);
    assert.ok(['combustion', 'electric'].includes(vehicle.powertrain));

    const upkeep = upkeepOf(vehicle);
    for (const [key, value] of Object.entries(upkeep)) {
      assert.ok(value > 0, `${vehicle.id} needs a positive ${key} rate`);
    }
  }
});

test('both powertrains have cars, and electric ones are priced in kWh', () => {
  assert.ok(vehiclesFor('combustion').length >= 10);
  assert.ok(vehiclesFor('electric').length > 0);

  for (const vehicle of vehiclesFor('electric')) {
    assert.equal(getFuel(vehicle.fuel).unit, 'kWh');
  }
  for (const vehicle of vehiclesFor('combustion')) {
    assert.equal(getFuel(vehicle.fuel).unit, 'l');
  }
});

test('every fuel has a label, unit, price, CO₂ factor and source', () => {
  for (const [id, fuel] of Object.entries(FUELS)) {
    assert.ok(fuel.label, `${id} needs a label`);
    assert.ok(['l', 'kWh'].includes(fuel.unit), `${id} has an unexpected unit`);
    assert.ok(fuel.defaultPrice > 0, `${id} needs a positive default price`);
    assert.ok(fuel.co2PerUnit > 0, `${id} needs a CO₂ factor`);
    assert.ok(fuel.source, `${id} needs a documented source`);
  }
});

test('upkeep totals land in ADAC full-cost territory', () => {
  // ADAC puts total running costs at roughly 26-95 ct/km across these classes,
  // of which fuel is a small part; upkeep alone should sit inside that band.
  for (const vehicle of VEHICLES) {
    const upkeep = vehicle.wear + vehicle.fixed + vehicle.dep;
    assert.ok(upkeep > 20 && upkeep < 90, `${vehicle.id} upkeep of ${upkeep} ct/km looks wrong`);
  }
});
