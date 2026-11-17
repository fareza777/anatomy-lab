// Closed-loop life support for a small orbital habitat. The cabin is a fixed volume: the model
// tracks oxygen partial pressure, carbon dioxide, total pressure, water reserve and temperature.
// Crew load, solar power, scrubber setting and water recovery all fight over the same margins.
export const SIM_SPEED = 10;

const CABIN_VOL = 120;
const P_NOMINAL = 101.3;
const O2_NOMINAL = 21.3;
const SOLAR_MAX = 45;
const EPS = 1e-6;

const lim = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export function initialState() {
  return {
    pressure: P_NOMINAL,
    o2: O2_NOMINAL,
    co2: 820,
    water: 78,
    temp: 22.1,
    leak: false,
    time: 0,
    o2prod: 0,
    powerMargin: 15,
    pwr: 1,
    solar: 38,
    load: 23,
  };
}

export function step(s, u, dtMin) {
  dtMin = Math.max(0, Math.min(dtMin, 30));
  if (!dtMin) return s;
  const crew = lim(u.crew, 1, 8);
  const solarFrac = lim(u.power / 100, 0, 1);
  const scrub = lim(u.scrubber / 100, 0, 1);
  const rec = lim(u.recycler / 100, 0, 1);

  s.solar = SOLAR_MAX * solarFrac;
  s.load = 8 + crew * 0.6 + scrub * 6 + rec * 5;
  s.powerMargin = s.solar - s.load;
  s.pwr = lim(s.solar / Math.max(s.load, 0.1), 0.25, 1);

  // A puncture vents the cabin until it is sealed. Pressure falls, and the oxygen partial
  // pressure falls with it at the cabin's oxygen fraction.
  if (s.leak) {
    const vent = 0.120 * dtMin;
    s.pressure -= vent;
    s.o2 -= vent * 0.21;
  }

  // The oxygen controller runs electrolysis just hard enough to hold 21.3 kPa, with a small
  // extra flow when the cabin is low. It stops when the water reserve or power margin is gone.
  const demand = crew * 0.0035;
  const command = lim(demand + (O2_NOMINAL - s.o2) * 0.020, 0, 0.060);
  const marginFactor = lim(s.powerMargin / 8, 0, 1);
  const o2prod = s.water > 3 && s.powerMargin > 0 ? command * marginFactor : 0;
  s.o2 += (o2prod - demand) * dtMin;
  s.water -= o2prod * 0.90 * dtMin;

  // CO2 is produced by the crew at a roughly fixed rate. The scrubber removes a fraction of
  // the cabin concentration each minute; power starvation slows the removal.
  const co2prod = crew * 2.5;
  const removal = s.co2 * 0.012 * scrub * s.pwr;
  s.co2 += (co2prod - removal) * dtMin;

  // Water: crew use is partly recovered from urine and humidity. Electrolysis is a second,
  // smaller draw. Recovery never quite closes the loop, which is why stations carry reserves.
  const waterUse = crew * 0.020;
  const recovery = waterUse * 0.92 * rec;
  s.water += (recovery - waterUse) * dtMin;
  s.water = lim(s.water, 0, 100);

  // Temperature is a first-order response to crew heat, equipment load and radiator capacity.
  const targetTemp = 20 + (1 - solarFrac) * 8 + crew * 0.30 - (s.leak ? 1.0 : 0);
  s.temp += (targetTemp - s.temp) * 0.040 * dtMin;

  s.o2 = lim(s.o2, 0, 30);
  s.co2 = lim(s.co2, 0, 30000);
  s.pressure = lim(s.pressure, 0, P_NOMINAL + 4);
  s.o2prod = o2prod;
  s.time += dtMin;
  return s;
}

export function outputs(s) {
  const alarms = [];
  if (s.o2 < 16) alarms.push("O2 low");
  if (s.co2 > 5000) alarms.push("CO2 high");
  if (s.pressure < 85) alarms.push("pressure low");
  if (s.water < 20) alarms.push("water low");
  if (s.temp > 27) alarms.push("temperature high");
  if (s.powerMargin < 0) alarms.push("power deficit");
  return {
    pressure: s.pressure,
    o2: s.o2,
    co2: s.co2,
    water: s.water,
    temp: s.temp,
    powerMargin: s.powerMargin,
    solar: s.solar,
    load: s.load,
    o2prod: s.o2prod,
    pwr: s.pwr,
    leak: s.leak,
    crew: s.crew,
    alarms,
    status: alarms.length === 0 ? "nominal" : alarms.length < 2 ? "caution" : "critical",
    time: s.time,
  };
}
