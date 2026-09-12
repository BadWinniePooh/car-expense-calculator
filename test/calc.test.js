import assert from 'node:assert/strict';
import { test } from 'node:test';

import { estimateTrip, fuelUsed } from '../src/calc.js';
import { FUEL_TYPES, VEHICLES, getFuelType, getVehicle } from '../src/data.js';

test('fuelUsed scales linearly with distance', () => {
  assert.equal(fuelUsed(100, 6.7), 6.7);
  assert.equal(fuelUsed(50, 6.7), 3.35);
  assert.equal(fuelUsed(0, 6.7), 0);
});

test('estimates a 250 km drive in the reference compact estate', () => {
  // 6.7 l/100 km at 2.145 €/l -> 16.75 l, 35.93 €
  const trip = estimateTrip({ distanceKm: 250, consumptionPer100Km: 6.7, pricePerUnit: 2.145 });

  assert.equal(trip.fuelUsed.toFixed(2), '16.75');
  assert.equal(trip.totalCost.toFixed(2), '35.93');
  assert.equal(trip.costPerKm.toFixed(4), '0.1437');
  assert.equal(trip.costPer100Km.toFixed(2), '14.37');
});

test('works unchanged for kWh/100 km and €/kWh', () => {
  const trip = estimateTrip({ distanceKm: 200, consumptionPer100Km: 18, pricePerUnit: 0.311 });

  assert.equal(trip.fuelUsed.toFixed(2), '36.00');
  assert.equal(trip.totalCost.toFixed(2), '11.20');
});

test('a zero distance costs nothing', () => {
  const trip = estimateTrip({ distanceKm: 0, consumptionPer100Km: 6.7, pricePerUnit: 2.145 });

  assert.equal(trip.fuelUsed, 0);
  assert.equal(trip.totalCost, 0);
  // Per-km figures stay meaningful even without a distance.
  assert.equal(trip.costPer100Km.toFixed(2), '14.37');
});

test('rejects non-numeric and negative input', () => {
  assert.throws(
    () => estimateTrip({ distanceKm: 'far', consumptionPer100Km: 6.7, pricePerUnit: 2 }),
    TypeError,
  );
  assert.throws(
    () => estimateTrip({ distanceKm: NaN, consumptionPer100Km: 6.7, pricePerUnit: 2 }),
    TypeError,
  );
  assert.throws(
    () => estimateTrip({ distanceKm: -10, consumptionPer100Km: 6.7, pricePerUnit: 2 }),
    RangeError,
  );
  assert.throws(
    () => estimateTrip({ distanceKm: 10, consumptionPer100Km: 6.7, pricePerUnit: -2 }),
    RangeError,
  );
});

test('the reference vehicle is the Golf Variant / i30 Kombi class', () => {
  const reference = VEHICLES[0];

  assert.equal(reference.id, 'compact-estate-petrol');
  assert.match(reference.examples, /Golf Variant/);
  assert.match(reference.examples, /i30 Kombi/);
});

test('every vehicle has usable data and a known fuel type', () => {
  const ids = new Set();

  for (const vehicle of VEHICLES) {
    assert.ok(vehicle.id, 'vehicle needs an id');
    assert.equal(ids.has(vehicle.id), false, `duplicate vehicle id: ${vehicle.id}`);
    ids.add(vehicle.id);

    assert.ok(vehicle.label && vehicle.category && vehicle.examples);
    assert.ok(vehicle.consumptionPer100Km > 0, `${vehicle.id} needs a positive consumption`);
    assert.ok(getFuelType(vehicle.fuelType), `${vehicle.id} points at an unknown fuel type`);
    assert.equal(getVehicle(vehicle.id), vehicle);
  }
});

test('every fuel type has a label, unit, price and source', () => {
  for (const [id, fuel] of Object.entries(FUEL_TYPES)) {
    assert.ok(fuel.label, `${id} needs a label`);
    assert.ok(['l', 'kWh'].includes(fuel.unit), `${id} has an unexpected unit`);
    assert.ok(fuel.defaultPrice > 0, `${id} needs a positive default price`);
    assert.ok(fuel.source, `${id} needs a documented source`);
  }
});
