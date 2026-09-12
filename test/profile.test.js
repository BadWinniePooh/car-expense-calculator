import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CUSTOM_ID,
  SCHEMA_VERSION,
  STORAGE_KEY,
  clearProfile,
  defaultProfile,
  loadProfile,
  normalizeProfile,
  powertrainOf,
  profileToVehicle,
  saveProfile,
} from '../src/profile.js';
import { estimateTrip } from '../src/calc.js';
import { getFuel, upkeepOf } from '../src/data.js';

/** A localStorage stand-in; `fail` makes every access throw, as private mode can. */
function fakeStorage({ fail = false } = {}) {
  const map = new Map();
  const guard = () => {
    if (fail) throw new DOMException('blocked');
  };
  return {
    map,
    getItem: (k) => (guard(), map.has(k) ? map.get(k) : null),
    setItem: (k, v) => (guard(), map.set(k, String(v)), undefined),
    removeItem: (k) => (guard(), map.delete(k), undefined),
  };
}

const VALID = { name: 'My estate', fuel: 'petrol', cons: 6.9, wear: 5, fixed: 8, dep: 25 };

test('a valid profile survives a save/load round trip', () => {
  const storage = fakeStorage();

  assert.equal(saveProfile(VALID, storage), true);
  assert.deepEqual(loadProfile(storage), VALID);
});

test('what is written is versioned, so a future schema can be detected', () => {
  const storage = fakeStorage();
  saveProfile(VALID, storage);

  const written = JSON.parse(storage.map.get(STORAGE_KEY));
  assert.equal(written.v, SCHEMA_VERSION);
  assert.deepEqual(written.profile, VALID);
});

test('a profile from an unknown schema version is discarded, not guessed at', () => {
  const storage = fakeStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify({ v: 99, profile: VALID }));

  assert.equal(loadProfile(storage), null);
});

test('junk in storage never reaches the app', () => {
  const storage = fakeStorage();

  for (const junk of [
    'not json at all',
    '{}',
    'null',
    JSON.stringify({ v: SCHEMA_VERSION, profile: null }),
    JSON.stringify({ v: SCHEMA_VERSION, profile: { ...VALID, fuel: 'kerosene' } }),
    JSON.stringify({ v: SCHEMA_VERSION, profile: { ...VALID, cons: 'lots' } }),
    JSON.stringify({ v: SCHEMA_VERSION, profile: { ...VALID, name: '   ' } }),
  ]) {
    storage.setItem(STORAGE_KEY, junk);
    assert.equal(loadProfile(storage), null, `should have rejected: ${junk}`);
  }
});

test('values are bounded, so a typo cannot produce an absurd estimate', () => {
  assert.equal(normalizeProfile({ ...VALID, cons: 9999 }), null);
  assert.equal(normalizeProfile({ ...VALID, cons: 0 }), null);
  assert.equal(normalizeProfile({ ...VALID, dep: -5 }), null);
  assert.equal(normalizeProfile({ ...VALID, dep: 501 }), null);
  // Zero upkeep is legitimate: a paid-off car really has no depreciation left.
  assert.deepEqual(normalizeProfile({ ...VALID, dep: 0 }).dep, 0);
});

test('a fuel name from the prototype chain is not a fuel', () => {
  for (const key of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    assert.equal(normalizeProfile({ ...VALID, fuel: key }), null, `${key} should be rejected`);
  }
});

test('input is cleaned: comma decimals, stray whitespace, over-long names', () => {
  const messy = normalizeProfile({ ...VALID, name: `  ${'x'.repeat(60)}  `, cons: '7,4' });

  assert.equal(messy.cons, 7.4);
  assert.equal(messy.name.length, 40);
});

test('blocked storage fails safely rather than throwing', () => {
  const storage = fakeStorage({ fail: true });

  assert.equal(loadProfile(storage), null);
  assert.equal(saveProfile(VALID, storage), false);
  assert.equal(clearProfile(storage), false);
  // And with no storage object at all.
  assert.equal(loadProfile(null), null);
  assert.equal(saveProfile(VALID, null), false);
});

test('an invalid profile is never written', () => {
  const storage = fakeStorage();

  assert.equal(saveProfile({ ...VALID, fuel: 'kerosene' }, storage), false);
  assert.equal(storage.map.size, 0);
});

test('forgetting removes it', () => {
  const storage = fakeStorage();
  saveProfile(VALID, storage);

  assert.equal(clearProfile(storage), true);
  assert.equal(loadProfile(storage), null);
});

test('powertrain follows from fuel and cannot disagree with it', () => {
  assert.equal(powertrainOf({ fuel: 'petrol' }), 'combustion');
  assert.equal(powertrainOf({ fuel: 'diesel' }), 'combustion');
  assert.equal(powertrainOf({ fuel: 'electricity' }), 'electric');
});

test('the default profile is itself valid', () => {
  assert.deepEqual(normalizeProfile(defaultProfile()), defaultProfile());
});

test('a saved profile behaves like any other vehicle', () => {
  const vehicle = profileToVehicle({ ...VALID, fuel: 'electricity', cons: 19 });

  assert.equal(vehicle.id, CUSTOM_ID);
  assert.equal(vehicle.powertrain, 'electric');
  assert.equal(vehicle.custom, true);
  assert.equal(getFuel(vehicle.fuel).unit, 'kWh');

  // It drops straight into the same estimator the built-in classes use.
  const trip = estimateTrip({
    distanceKm: 100,
    consumptionPer100Km: vehicle.cons,
    pricePerUnit: 0.311,
    upkeep: upkeepOf(vehicle),
  });
  assert.equal(trip.fuelCost.toFixed(2), '5.91');
  assert.equal(trip.upkeepCost.toFixed(2), '38.00');
});
