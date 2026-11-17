// Integrated steel mill model: ironmaking, steelmaking, continuous casting and hot rolling.
//
// Each stage has a capacity in tonnes per hour. The blast furnace makes hot metal, the basic
// oxygen furnace turns it into steel, the caster freezes it into a slab, and the rolling mill
// rolls that slab into strip. The smallest capacity is the plant's bottleneck, so adding blast
// volume only helps until the caster or the mill becomes the limit.

export const SIM_SPEED = 18;

const lim = (v, a, b) => Math.min(b, Math.max(a, v));

export function initialState() {
  return {
    time: 0,
    iron: 0,
    steel: 0,
    strip: 0,
    temp: 1450,
    cast: 1.6,
    tapped: 0,
    heat: 0,
    bottleneck: "caster",
  };
}

export function step(s, u, dt) {
  const blast = lim(u.blast, 60, 100);
  const oxygen = lim(u.oxygen, 50, 100);
  const casting = lim(u.casting, 0.8, 2.2);
  const rolling = lim(u.rolling, 40, 100);

  // Iron rate rises faster than blast volume: more wind burns more coke per unit of air.
  const ironCap = 240 * Math.pow(blast / 100, 1.7);
  const steelCap = Math.min(ironCap * 0.92, 190 * (oxygen / 100));
  const castCap = casting * 105;       // t/h for a 220 x 1,300 mm slab
  const millCap = 200 * (rolling / 100);

  s.iron = ironCap;
  s.steel = steelCap;
  s.cast = casting;
  s.strip = Math.min(steelCap, castCap, millCap);
  s.temp = 1400 + 150 * (blast / 100) + 25 * (oxygen / 100);
  s.bottleneck = steelCap <= castCap && steelCap <= millCap ? (ironCap * 0.92 <= 190 * (oxygen / 100) ? "blast" : "oxygen")
    : castCap <= millCap ? "caster" : "mill";
  s.tapped = Math.min(1e9, s.tapped + (s.strip * dt) / 3600);
  s.time += dt;
  return s;
}

export function outputs(s) {
  return {
    iron: s.iron,
    steel: s.steel,
    strip: s.strip,
    temp: s.temp,
    casting: s.cast,
    bottleneck: s.bottleneck,
    tapped: s.tapped,
  };
}
