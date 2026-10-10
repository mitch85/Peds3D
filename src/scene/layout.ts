import type { Vec2 } from '../game/types';

/** Room layout shared by scene furniture and pet behaviours (world units, y up, camera looks towards -z). */
export const ROOM = {
  width: 6,
  depth: 4.6,
  /** Area the pet may walk in. */
  bounds: { minX: -2.4, maxX: 2.4, minZ: -1.6, maxZ: 1.7 },
};

export interface Spot {
  /** Where the furniture stands. */
  at: Vec2;
  /** Where the pet stands to use it. */
  stand: Vec2;
  /** Direction the pet faces while using it (point to look at). */
  face: Vec2;
}

export const SPOTS = {
  bowl: { at: { x: -2.2, z: 0.9 }, stand: { x: -1.6, z: 0.9 }, face: { x: -2.2, z: 0.9 } },
  litter: { at: { x: 2.0, z: -1.25 }, stand: { x: 2.0, z: -1.2 }, face: { x: 2.0, z: 3 } },
  bed: { at: { x: -1.9, z: -1.2 }, stand: { x: -1.9, z: -1.15 }, face: { x: -1.2, z: 3 } },
  toys: { at: { x: 2.25, z: 1.25 }, stand: { x: 1.7, z: 1.1 }, face: { x: 2.25, z: 1.25 } },
  center: { at: { x: 0, z: 0.3 }, stand: { x: 0, z: 0.3 }, face: { x: 0, z: 5 } },
} satisfies Record<string, Spot>;

export function clampToRoom(p: Vec2): Vec2 {
  const b = ROOM.bounds;
  return { x: Math.min(b.maxX, Math.max(b.minX, p.x)), z: Math.min(b.maxZ, Math.max(b.minZ, p.z)) };
}

export function randomRoomPoint(random = Math.random): Vec2 {
  const b = ROOM.bounds;
  // Prefer the open middle of the room
  return {
    x: b.minX + 0.6 + random() * (b.maxX - b.minX - 1.2),
    z: b.minZ + 0.6 + random() * (b.maxZ - b.minZ - 0.9),
  };
}
