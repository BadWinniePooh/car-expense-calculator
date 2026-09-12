/**
 * Pure trip-cost math. No I/O, no DOM, no storage — safe to unit test.
 *
 * The same formulas work for combustion cars (litres per 100 km, price per
 * litre) and for electric cars (kWh per 100 km, price per kWh), because the
 * unit of "fuel" never enters the arithmetic.
 */

/** Amount of fuel/energy needed for a distance, in the vehicle's unit. */
export function fuelUsed(distanceKm, consumptionPer100Km) {
  return (distanceKm / 100) * consumptionPer100Km;
}

/**
 * Estimate the cost of a drive.
 *
 * @param {object} input
 * @param {number} input.distanceKm         driven kilometres
 * @param {number} input.consumptionPer100Km litres (or kWh) per 100 km
 * @param {number} input.pricePerUnit        price per litre (or per kWh)
 * @returns {{fuelUsed: number, totalCost: number, costPerKm: number, costPer100Km: number}}
 */
export function estimateTrip({ distanceKm, consumptionPer100Km, pricePerUnit }) {
  for (const [name, value] of Object.entries({ distanceKm, consumptionPer100Km, pricePerUnit })) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(`${name} must be a finite number`);
    }
    if (value < 0) {
      throw new RangeError(`${name} must not be negative`);
    }
  }

  const used = fuelUsed(distanceKm, consumptionPer100Km);
  const costPer100Km = consumptionPer100Km * pricePerUnit;

  return {
    fuelUsed: used,
    totalCost: used * pricePerUnit,
    costPerKm: costPer100Km / 100,
    costPer100Km,
  };
}
