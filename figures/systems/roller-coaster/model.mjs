// Roller coaster model: energy, loop forces and hourly capacity.
//
// A coaster is an energy machine. The lift puts potential energy into the train; gravity turns it
// back into speed. The loop then demands centripetal force, which the riders feel as positive g.
// Capacity is a separate problem: seats per train divided by the time between dispatches, or by
// the time a single train needs to complete the circuit, whichever is slower.

export const SEATS_PER_CAR = 2;
export const SIM_SPEED = 1;

const lim = (v, a, b) => Math.min(b, Math.max(a, v));
const GRAV = 9.81;

export function initialState() {
  return {
    time: 0,
    speed: 0,
    gMax: 0,
    rideTime: 0,
    capacity: 0,
    energy: 0,
    airtime: 0,
    laps: 0,
    bottleneck: "circuit",
    lift: 30,
  };
}

export function step(s, u, dt) {
  const lift = lim(u.lift, 18, 45);
  const cars = Math.round(lim(u.cars, 3, 8));
  const dispatch = lim(u.dispatch, 15, 40);
  const brake = lim(u.brake, 0.5, 1);
  s.lift = lift;

  // Ideal energy from the lift, minus rolling and air losses.
  const vTop = Math.sqrt(2 * GRAV * (lift - 1.2)) * 0.93;
  s.speed = vTop * 3.6;
  // A vertical loop of radius 14 m at the bottom of the first drop.
  s.gMax = 1 + (vTop * vTop) / (GRAV * 14);
  s.rideTime = (16 + 640 / Math.max(6, vTop * 0.56) + cars * 1.3) * (0.9 + 0.2 * brake);
  s.capacity = Math.min((cars * SEATS_PER_CAR * 3600) / dispatch, (cars * SEATS_PER_CAR * 3600) / (s.rideTime + 9));
  s.energy = (0.5 * cars * 1250 * vTop * vTop) / 1e6;
  s.airtime = Math.max(0, (lift - 22) * 0.18);
  s.bottleneck = dispatch > s.rideTime + 9 ? "dispatch" : "circuit";
  s.time += dt;
  return s;
}

export function outputs(s) {
  return {
    speed: s.speed,
    gMax: s.gMax,
    rideTime: s.rideTime,
    capacity: s.capacity,
    energy: s.energy,
    airtime: s.airtime,
    laps: s.laps,
    bottleneck: s.bottleneck,
    lift: s.lift,
  };
}
