import { estimateTrip } from './calc.js';
import {
  DATA_AS_OF,
  DEFAULT_VEHICLE_ID,
  FUEL_TYPES,
  VEHICLES,
  getFuelType,
  getVehicle,
} from './data.js';

const el = (id) => document.getElementById(id);

const ui = {
  form: el('trip-form'),
  vehicle: el('vehicle'),
  vehicleHint: el('vehicle-hint'),
  fuelType: el('fuel-type'),
  fuelHint: el('fuel-hint'),
  consumption: el('consumption'),
  consumptionUnit: el('consumption-unit'),
  price: el('price'),
  priceUnit: el('price-unit'),
  priceHint: el('price-hint'),
  distance: el('distance'),
  error: el('error'),
  result: el('result'),
  resultTotal: el('result-total'),
  resultFuel: el('result-fuel'),
  resultFuelLabel: el('result-fuel-label'),
  resultPerKm: el('result-per-km'),
  resultPer100: el('result-per-100'),
  dataNote: el('data-note'),
};

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' });
const moneyPrecise = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
const amount = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });

/** True while the user has not overridden the field for the current selection. */
let priceIsPristine = true;

function populateVehicles() {
  const groups = new Map();
  for (const vehicle of VEHICLES) {
    if (!groups.has(vehicle.category)) groups.set(vehicle.category, []);
    groups.get(vehicle.category).push(vehicle);
  }

  for (const [category, vehicles] of groups) {
    const group = document.createElement('optgroup');
    group.label = category;
    for (const vehicle of vehicles) {
      const option = document.createElement('option');
      option.value = vehicle.id;
      option.textContent = vehicle.label;
      group.append(option);
    }
    ui.vehicle.append(group);
  }

  ui.vehicle.value = DEFAULT_VEHICLE_ID;
}

function populateFuelTypes() {
  for (const [id, fuel] of Object.entries(FUEL_TYPES)) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = fuel.label;
    ui.fuelType.append(option);
  }
}

/** Apply the selected vehicle's defaults to consumption, fuel type and price. */
function applyVehicleDefaults() {
  const vehicle = getVehicle(ui.vehicle.value);
  if (!vehicle) return;

  ui.consumption.value = vehicle.consumptionPer100Km;
  ui.fuelType.value = vehicle.fuelType;
  ui.vehicleHint.textContent = [vehicle.examples, vehicle.note].filter(Boolean).join(' — ');

  priceIsPristine = true;
  applyFuelDefaults();
}

/** Apply the selected fuel type's unit and — unless edited — its default price. */
function applyFuelDefaults() {
  const fuel = getFuelType(ui.fuelType.value);
  if (!fuel) return;

  ui.consumptionUnit.textContent = `(${fuel.unit}/100 km)`;
  ui.priceUnit.textContent = `(€/${fuel.unit})`;
  ui.resultFuelLabel.textContent = fuel.unit === 'kWh' ? 'Energy needed' : 'Fuel needed';
  ui.fuelHint.textContent = fuel.source;
  ui.priceHint.textContent = `Default: ${moneyPrecise.format(fuel.defaultPrice)}/${fuel.unit} (${DATA_AS_OF}). Enter today's price for a better estimate.`;

  if (priceIsPristine) {
    ui.price.value = fuel.defaultPrice;
  }

  calculate();
}

function readNumber(input) {
  if (input.value.trim() === '') return null;
  const value = Number(input.value);
  return Number.isFinite(value) ? value : null;
}

function showError(message) {
  ui.error.textContent = message;
  ui.error.hidden = false;
  ui.result.hidden = true;
}

function clearError() {
  ui.error.hidden = true;
  ui.error.textContent = '';
}

function calculate() {
  const distanceKm = readNumber(ui.distance);
  const consumptionPer100Km = readNumber(ui.consumption);
  const pricePerUnit = readNumber(ui.price);

  if (distanceKm === null || consumptionPer100Km === null || pricePerUnit === null) {
    // Nothing to complain about yet — the user is still filling the form in.
    clearError();
    ui.result.hidden = true;
    return;
  }

  if (distanceKm < 0 || consumptionPer100Km < 0 || pricePerUnit < 0) {
    showError('Distance, consumption and price must not be negative.');
    return;
  }

  clearError();
  const fuel = getFuelType(ui.fuelType.value);
  const trip = estimateTrip({ distanceKm, consumptionPer100Km, pricePerUnit });

  ui.resultTotal.textContent = money.format(trip.totalCost);
  ui.resultFuel.textContent = `${amount.format(trip.fuelUsed)} ${fuel.unit}`;
  ui.resultPerKm.textContent = `${moneyPrecise.format(trip.costPerKm)}/km`;
  ui.resultPer100.textContent = `${money.format(trip.costPer100Km)}/100 km`;
  ui.result.hidden = false;
}

function init() {
  populateVehicles();
  populateFuelTypes();
  applyVehicleDefaults();

  ui.dataNote.textContent = `Default consumption figures are real-world averages for the vehicle class, default prices are German averages as of ${DATA_AS_OF}. Both are estimates — your own figures will always be more accurate.`;

  ui.vehicle.addEventListener('change', applyVehicleDefaults);
  ui.fuelType.addEventListener('change', () => {
    priceIsPristine = true;
    applyFuelDefaults();
  });
  ui.price.addEventListener('input', () => {
    priceIsPristine = false;
    calculate();
  });
  ui.consumption.addEventListener('input', calculate);
  ui.distance.addEventListener('input', calculate);
  ui.form.addEventListener('submit', (event) => {
    event.preventDefault();
    calculate();
  });
}

init();
