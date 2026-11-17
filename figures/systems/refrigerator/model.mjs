// Fridge-freezer thermal model: heat leaks in through the walls, a vapour-compression cycle
// pumps it out while a thermostat switches the compressor on and off.
export const UA = 2.8; // W/K, fridge and freezer walls together (as seen from the fridge temperature)
export const DOOR_LEAK = 30; // W extra while the door stands open
export const CAPACITY = 140; // W of heat removed while running
export const THERMAL_MASS = 30000; // J/K: the air, shelves and food inside
export const HYST = 1.0; // thermostat switching band, ±K
const K = 273.15;
/** Real COP: 45 % of Carnot between evaporator and condenser temperatures. */
export function cop(insideC, roomC) {
  const te = insideC - 26 + K, tc = roomC + 12 + K; // evaporator runs well below the freezer; condenser above room
  return 0.45 * (te / (tc - te));
}
export function step(s, dt, set, room, door) {
  const leak = UA * (room - s.T) + (door ? DOOR_LEAK : 0);
  let on = s.on;
  if (s.T > set + HYST) on = true;
  if (s.T < set - HYST) on = false;
  const q = on ? CAPACITY : 0;
  const T = s.T + ((leak - q) * dt) / THERMAL_MASS;
  const power = on ? CAPACITY / cop(T, room) : 0;
  return { T, on, power, leak, runTime: s.runTime + (on ? dt : 0), time: s.time + dt, energy: s.energy + power * dt };
}
export const start = (room) => ({ T: Math.min(room, 6), on: false, power: 0, leak: 0, runTime: 0, time: 0, energy: 0 });
