/**
 * Pure trip-cost math. No I/O, no DOM, no storage — safe to unit test.
 *
 * The same formulas cover combustion cars (litres per 100 km, price per litre)
 * and electric ones (kWh per 100 km, price per kWh), because the unit of
 * "fuel" never enters the arithmetic.
 *
 * Upkeep rates are in cents per kilometre, on the ADAC basis of a new car held
 * five years at 15,000 km a year. Dividing by 100 turns cents into euros.
 */

/** Amount of fuel/energy needed for a distance, in the vehicle's unit. */
export function fuelUsed(distanceKm, consumptionPer100Km) {
  return (distanceKm / 100) * consumptionPer100Km;
}

/** Cost of a per-kilometre rate given in cents, over a distance, in euros. */
export function rateCost(distanceKm, centsPerKm) {
  return (distanceKm * centsPerKm) / 100;
}

function requireNumber(name, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  if (value < 0) {
    throw new RangeError(`${name} must not be negative`);
  }
}

/**
 * Estimate the cost of a drive, fuel plus the share of ownership it consumes.
 *
 * @param {object} input
 * @param {number}  input.distanceKm          one-way distance in km
 * @param {number}  input.consumptionPer100Km litres (or kWh) per 100 km
 * @param {number}  input.pricePerUnit        price per litre (or per kWh)
 * @param {object}  [input.upkeep]            {wear, fixed, depreciation} in ct/km
 * @param {number}  [input.co2PerUnit]        kg CO₂ per litre (or per kWh)
 * @param {boolean} [input.roundTrip]         double the distance
 * @param {number}  [input.people]            split the total between this many
 */
export function estimateTrip({
  distanceKm,
  consumptionPer100Km,
  pricePerUnit,
  upkeep = { wear: 0, fixed: 0, depreciation: 0 },
  co2PerUnit = 0,
  roundTrip = false,
  people = 1,
}) {
  requireNumber('distanceKm', distanceKm);
  requireNumber('consumptionPer100Km', consumptionPer100Km);
  requireNumber('pricePerUnit', pricePerUnit);
  requireNumber('co2PerUnit', co2PerUnit);
  for (const key of ['wear', 'fixed', 'depreciation']) {
    requireNumber(`upkeep.${key}`, upkeep[key] ?? 0);
  }
  if (!Number.isInteger(people) || people < 1) {
    throw new RangeError('people must be a whole number of at least 1');
  }

  const km = roundTrip ? distanceKm * 2 : distanceKm;
  const used = fuelUsed(km, consumptionPer100Km);

  const wear = upkeep.wear ?? 0;
  const fixed = upkeep.fixed ?? 0;
  const depreciation = upkeep.depreciation ?? 0;
  const upkeepRatePerKm = wear + fixed + depreciation;

  const fuelCost = used * pricePerUnit;
  const wearCost = rateCost(km, wear);
  const fixedCost = rateCost(km, fixed);
  const depreciationCost = rateCost(km, depreciation);
  const upkeepCost = wearCost + fixedCost + depreciationCost;
  const totalCost = fuelCost + upkeepCost;

  // Per-km figures stay meaningful at zero distance, so derive them from the
  // rates rather than dividing by a distance that may be zero.
  const costPer100Km = consumptionPer100Km * pricePerUnit + upkeepRatePerKm;

  return {
    distanceKm: km,
    fuelUsed: used,
    fuelCost,
    wearCost,
    fixedCost,
    depreciationCost,
    upkeepCost,
    upkeepRatePerKm,
    totalCost,
    perPerson: totalCost / people,
    co2Kg: used * co2PerUnit,
    costPerKm: costPer100Km / 100,
    costPer100Km,
  };
}
