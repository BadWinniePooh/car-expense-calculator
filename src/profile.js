/**
 * The one thing this app remembers: a custom car profile the user configured.
 *
 * Everything else is deliberately ephemeral. This module is the whole of the
 * exception, so the rules live in one place:
 *
 *   - it is written only when the user presses Save, never as a side effect;
 *   - it never leaves the device (the page makes no network calls at all);
 *   - storage can be absent, full, or blocked, so every access is guarded and
 *     the app must stay usable when it fails;
 *   - anything read back is untrusted input — a previous version's shape, a
 *     hand-edited value, another tab's mistake — so it is validated, not
 *     assumed.
 */

import { FUELS } from './data.js';

export const STORAGE_KEY = 'trip-cost-calculator:custom-car';
export const SCHEMA_VERSION = 1;
export const CUSTOM_ID = 'custom';

const NAME_MAX = 40;

/** Plausibility bounds. Wide enough for a lorry, tight enough to catch junk. */
const LIMITS = {
  cons: { min: 0.1, max: 200 },
  wear: { min: 0, max: 200 },
  fixed: { min: 0, max: 200 },
  dep: { min: 0, max: 500 },
};

export function defaultProfile() {
  return { name: 'My car', fuel: 'petrol', cons: 6.7, wear: 5.2, fixed: 7.8, dep: 27 };
}

/** A profile's powertrain follows from its fuel, so the two can never disagree. */
export function powertrainOf(profile) {
  return profile.fuel === 'electricity' ? 'electric' : 'combustion';
}

function cleanNumber(value, { min, max }) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

/**
 * Coerce anything claiming to be a profile into a valid one.
 *
 * @returns {object|null} the profile, or null if it cannot be salvaged
 */
export function normalizeProfile(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!Object.prototype.hasOwnProperty.call(FUELS, raw.fuel)) return null;

  const name = String(raw.name ?? '').trim().slice(0, NAME_MAX);
  if (!name) return null;

  const numbers = {};
  for (const [key, bounds] of Object.entries(LIMITS)) {
    const value = cleanNumber(raw[key], bounds);
    if (value === null) return null;
    numbers[key] = value;
  }

  return { name, fuel: raw.fuel, ...numbers };
}

/** Present a profile as a vehicle, so the rest of the app cannot tell it apart. */
export function profileToVehicle(profile) {
  return {
    id: CUSTOM_ID,
    powertrain: powertrainOf(profile),
    name: profile.name,
    examples: 'Your own figures',
    fuel: profile.fuel,
    badge: profile.fuel === 'electricity' ? 'electric' : profile.fuel,
    cons: profile.cons,
    wear: profile.wear,
    fixed: profile.fixed,
    dep: profile.dep,
    custom: true,
  };
}

/** localStorage if it is usable, otherwise null — private mode throws on access. */
export function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadProfile(storage = defaultStorage()) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Unknown schema versions are discarded rather than guessed at.
    if (!parsed || parsed.v !== SCHEMA_VERSION) return null;
    return normalizeProfile(parsed.profile);
  } catch {
    return null;
  }
}

/** @returns {boolean} whether the profile actually reached storage */
export function saveProfile(profile, storage = defaultStorage()) {
  const clean = normalizeProfile(profile);
  if (!clean || !storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ v: SCHEMA_VERSION, profile: clean }));
    return true;
  } catch {
    return false;
  }
}

export function clearProfile(storage = defaultStorage()) {
  if (!storage) return false;
  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
