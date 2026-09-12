import { estimateTrip } from './calc.js';
import {
  DATA_AS_OF,
  DEFAULT_VEHICLE_ID,
  DISTANCE_PRESETS,
  FUELS,
  PEOPLE_OPTIONS,
  POWERTRAINS,
  getFuel,
  getVehicle,
  upkeepOf,
  vehiclesFor,
} from './data.js';

const el = (id) => document.getElementById(id);

const ui = {
  segmented: document.querySelector('.segmented'),
  cards: el('vehicle-cards'),
  consumption: el('consumption'),
  consumptionLabel: el('consumption-label'),
  price: el('price'),
  priceLabel: el('price-label'),
  distance: el('distance'),
  presets: el('presets'),
  roundTrip: el('round-trip'),
  people: el('people'),
  peopleWord: el('people-word'),
  error: el('error'),
  total: el('total'),
  summary: el('summary'),
  metrics: el('metrics'),
  dataNote: el('data-note'),
};

/**
 * All state lives here and nowhere else — no storage, no query string. Closing
 * the tab is what "nothing is stored" means, so it has to be true of the code.
 *
 * Prices are kept per fuel so that switching between a petrol and a diesel car
 * does not overwrite a price the user typed for the other one.
 */
const state = {
  powertrain: 'combustion',
  vehicleId: DEFAULT_VEHICLE_ID,
  consumption: String(getVehicle(DEFAULT_VEHICLE_ID).cons),
  prices: Object.fromEntries(
    Object.entries(FUELS).map(([id, fuel]) => [id, String(fuel.defaultPrice)]),
  ),
  distance: '120',
  roundTrip: false,
  people: 1,
};

const decimal = (digits) =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const fmt = (value, digits) => decimal(digits).format(value);
const money = (value, digits = 2) => `€ ${fmt(value, digits)}`;

/** Parse a user-typed number, tolerating a comma decimal separator. */
function num(value) {
  const parsed = Number.parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function currentVehicle() {
  return getVehicle(state.vehicleId);
}

function currentFuel() {
  return getFuel(currentVehicle().fuel);
}

/* ---------- rendering ---------- */

function renderSegmented() {
  ui.segmented.replaceChildren(
    ...POWERTRAINS.map((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'segmented__option';
      button.textContent = option.label;
      button.setAttribute('aria-pressed', String(state.powertrain === option.id));
      button.addEventListener('click', () => selectPowertrain(option.id));
      return button;
    }),
  );
}

function renderCards() {
  const vehicles = vehiclesFor(state.powertrain);

  ui.cards.replaceChildren(
    ...vehicles.map((vehicle) => {
      const selected = vehicle.id === state.vehicleId;
      const unit = getFuel(vehicle.fuel).unit;
      const upkeep = vehicle.wear + vehicle.fixed + vehicle.dep;

      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card';
      card.setAttribute('aria-pressed', String(selected));
      card.addEventListener('click', () => selectVehicle(vehicle.id));

      const top = document.createElement('div');
      top.className = 'card__top';
      top.append(
        span('card__name', vehicle.name),
        span('card__fuel', vehicle.badge),
      );

      const figures = document.createElement('div');
      figures.className = 'card__figures';
      figures.append(
        span('card__consumption', `${fmt(vehicle.cons, 1)} ${unit}/100 km`),
        span('card__upkeep', `+ ${fmt(upkeep, 1)} ct/km to own`),
      );

      card.append(top, span('card__examples', vehicle.examples), figures);
      return card;
    }),
  );
}

function span(className, text) {
  const node = document.createElement('span');
  node.className = className;
  node.textContent = text;
  return node;
}

function renderPresets() {
  ui.presets.replaceChildren(
    ...DISTANCE_PRESETS.map((km) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip';
      button.textContent = `${km} km`;
      button.addEventListener('click', () => {
        state.distance = String(km);
        ui.distance.value = state.distance;
        calculate();
      });
      return button;
    }),
  );
}

function renderPeople() {
  ui.people.replaceChildren(
    ...PEOPLE_OPTIONS.map((n) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'split__option';
      button.textContent = String(n);
      button.setAttribute('aria-pressed', String(n === state.people));
      button.setAttribute('aria-label', `${n} ${n === 1 ? 'person' : 'people'}`);
      button.addEventListener('click', () => {
        state.people = n;
        renderPeople();
        calculate();
      });
      return button;
    }),
  );
  ui.peopleWord.textContent = state.people === 1 ? 'person' : 'people';
}

/* ---------- selection ---------- */

function selectPowertrain(id) {
  if (state.powertrain === id) return;
  state.powertrain = id;
  // Landing on a powertrain means landing on its first car, so the cards and
  // the numbers never disagree about which vehicle is selected.
  selectVehicle(vehiclesFor(id)[0].id);
  renderSegmented();
}

function selectVehicle(id) {
  state.vehicleId = id;
  state.consumption = String(getVehicle(id).cons);
  ui.consumption.value = state.consumption;
  renderCards();
  syncFuelFields();
  calculate();
}

/** Point the consumption and price fields at the selected car's fuel. */
function syncFuelFields() {
  const vehicle = currentVehicle();
  const fuel = currentFuel();

  ui.consumptionLabel.textContent = `Consumption (${fuel.unit}/100 km)`;
  ui.priceLabel.textContent = `${fuel.label} price (€/${fuel.unit})`;
  ui.price.value = state.prices[vehicle.fuel];
  ui.price.step = fuel.unit === 'kWh' ? '0.01' : '0.001';
}

/* ---------- result ---------- */

function metricsFor(trip, fuel) {
  const energy = fuel.unit === 'kWh';

  return [
    { label: energy ? 'Electricity' : 'Fuel', value: money(trip.fuelCost) },
    { label: 'Wear & service', value: money(trip.wearCost) },
    { label: 'Insurance & tax', value: money(trip.fixedCost) },
    { label: 'Depreciation', value: money(trip.depreciationCost) },
    { label: energy ? 'Energy used' : 'Fuel used', value: `${fmt(trip.fuelUsed, 1)} ${fuel.unit}` },
    { label: 'Per km', value: money(trip.costPerKm, 3) },
    { label: 'Distance', value: `${fmt(trip.distanceKm, 0)} km` },
    ...(state.people > 1 ? [{ label: 'Per person', value: money(trip.perPerson) }] : []),
    { label: 'CO₂', value: `${fmt(trip.co2Kg, 1)} kg` },
  ];
}

function summaryFor(trip, vehicle, fuel, price) {
  return [
    vehicle.name,
    `${fmt(num(state.consumption), 1)} ${fuel.unit}/100 km`,
    `${fmt(trip.distanceKm, 0)} km${state.roundTrip ? ' return' : ''} at ${money(price, 2)}/${fuel.unit}`,
    `incl. ${fmt(trip.upkeepRatePerKm, 1)} ct/km upkeep`,
  ].join(' · ');
}

function calculate() {
  const vehicle = currentVehicle();
  const fuel = currentFuel();
  const price = num(state.prices[vehicle.fuel]);

  const negative = [state.consumption, state.prices[vehicle.fuel], state.distance].some(
    (value) => value.trim() !== '' && Number.parseFloat(String(value).replace(',', '.')) < 0,
  );
  if (negative) {
    ui.error.textContent = 'Consumption, price and distance must not be negative.';
    ui.error.hidden = false;
  } else {
    ui.error.hidden = true;
  }

  const trip = estimateTrip({
    distanceKm: num(state.distance),
    consumptionPer100Km: num(state.consumption),
    pricePerUnit: price,
    upkeep: upkeepOf(vehicle),
    co2PerUnit: fuel.co2PerUnit,
    roundTrip: state.roundTrip,
    people: state.people,
  });

  ui.total.textContent = money(trip.totalCost);
  ui.summary.textContent = summaryFor(trip, vehicle, fuel, price);

  ui.metrics.replaceChildren(
    ...metricsFor(trip, fuel).map((metric) => {
      const cell = document.createElement('div');
      cell.className = 'metric';
      cell.append(span('metric__label', metric.label), span('metric__value', metric.value));
      return cell;
    }),
  );
}

/* ---------- wiring ---------- */

function init() {
  renderSegmented();
  renderCards();
  renderPresets();
  renderPeople();
  syncFuelFields();

  ui.consumption.value = state.consumption;
  ui.distance.value = state.distance;
  ui.dataNote.textContent = `Fuel prices are German averages as of ${DATA_AS_OF}; consumption figures are real-world class averages, not WLTP. Every number here is editable — your own figures will always beat the defaults.`;

  ui.consumption.addEventListener('input', () => {
    state.consumption = ui.consumption.value;
    calculate();
  });
  ui.price.addEventListener('input', () => {
    state.prices[currentVehicle().fuel] = ui.price.value;
    calculate();
  });
  ui.distance.addEventListener('input', () => {
    state.distance = ui.distance.value;
    calculate();
  });
  ui.roundTrip.addEventListener('click', () => {
    state.roundTrip = !state.roundTrip;
    ui.roundTrip.setAttribute('aria-pressed', String(state.roundTrip));
    calculate();
  });

  calculate();
}

init();
