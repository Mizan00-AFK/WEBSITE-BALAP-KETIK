/**
 * Motorcycle catalogue.
 *
 * Stats are cosmetic only - every bike is equally fast, because the speed of
 * a bike comes 100% from the typing of its rider. To add a motorcycle:
 *   1. Put an SVG/PNG in client/public/assets/motorcycles/<id>.svg (200x110 viewBox,
 *      rear wheel centre at (44,82), front wheel centre at (160,82), radius 24).
 *   2. Add an entry below.
 */
export interface MotorcycleDef {
  id: string;
  name: string;
  tagline: string;
  /** Main body colour (used for UI accents). */
  color: string;
  /** Path relative to the client's public folder. */
  sprite: string;
  stats: { speed: number; acceleration: number; handling: number };
}

export const MOTORCYCLES: readonly MotorcycleDef[] = [
  {
    id: 'speedster',
    name: 'Speedster',
    tagline: 'Supersport ringan dengan aerodinamika tajam.',
    color: '#22d3ee',
    sprite: 'assets/motorcycles/speedster.svg',
    stats: { speed: 5, acceleration: 4, handling: 4 },
  },
  {
    id: 'thunder',
    name: 'Thunder',
    tagline: 'Motor besar bertenaga dengan mesin V-twin menggelegar.',
    color: '#fb923c',
    sprite: 'assets/motorcycles/thunder.svg',
    stats: { speed: 4, acceleration: 5, handling: 3 },
  },
  {
    id: 'phantom',
    name: 'Phantom',
    tagline: 'Prototipe listrik siluman dengan cahaya neon di bawahnya.',
    color: '#a855f7',
    sprite: 'assets/motorcycles/phantom.svg',
    stats: { speed: 4, acceleration: 4, handling: 5 },
  },
  {
    id: 'blaze',
    name: 'Blaze',
    tagline: 'Motor street fighter berhias motif api.',
    color: '#ef4444',
    sprite: 'assets/motorcycles/blaze.svg',
    stats: { speed: 5, acceleration: 5, handling: 3 },
  },
];

export const DEFAULT_MOTORCYCLE_ID = MOTORCYCLES[0].id;

export function getMotorcycle(id: string): MotorcycleDef {
  return MOTORCYCLES.find((m) => m.id === id) ?? MOTORCYCLES[0];
}

export function isValidMotorcycle(id: unknown): id is string {
  return typeof id === 'string' && MOTORCYCLES.some((m) => m.id === id);
}

/**
 * Wheel geometry shared by every motorcycle sprite (in sprite viewBox units).
 * Phaser uses it to draw spinning spokes on top of the static sprite.
 */
export const MOTORCYCLE_GEOMETRY = {
  width: 200,
  height: 110,
  rearWheel: { x: 44, y: 82 },
  frontWheel: { x: 160, y: 82 },
  wheelRadius: 24,
  rimRadius: 15,
  exhaust: { x: 28, y: 66 },
  headlight: { x: 170, y: 54 },
} as const;
