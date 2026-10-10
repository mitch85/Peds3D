import { useMemo } from 'react';
import * as THREE from 'three';
import { ACCESSORIES } from '../game/items';
import type { AccessoryId } from '../game/types';
import { toon } from '../scene/toon';

/** Accessory attached to the head group of the placeholder rig. */
export function Accessory({ id, biped }: { id: AccessoryId | null; biped: boolean }) {
  const geo = useMemo(
    () => ({
      cone: new THREE.ConeGeometry(1, 1, 16),
      sphere: new THREE.SphereGeometry(1, 12, 10),
      torus: new THREE.TorusGeometry(1, 0.35, 8, 20),
      cylinder: new THREE.CylinderGeometry(1, 1, 1, 16, 1, true),
    }),
    [],
  );
  if (!id) return null;
  const color = ACCESSORIES[id].color;
  const top = biped ? 0.22 : 0.24;

  switch (id) {
    case 'partyHat':
      return (
        <group position={[0.04, top, -0.02]} rotation={[0, 0, -0.2]}>
          <mesh geometry={geo.cone} material={toon(color)} position={[0, 0.12, 0]} scale={[0.09, 0.24, 0.09]} castShadow />
          <mesh geometry={geo.sphere} material={toon('#ffe066')} position={[0, 0.25, 0]} scale={0.035} />
        </group>
      );
    case 'bow':
      return (
        <group position={[0.13, top - 0.02, 0.02]} rotation={[0, 0, -0.4]}>
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={geo.cone} material={toon(color)} position={[s * 0.05, 0, 0]} rotation={[0, 0, (s * Math.PI) / 2]} scale={[0.04, 0.08, 0.025]} />
          ))}
          <mesh geometry={geo.sphere} material={toon(color)} scale={0.025} />
        </group>
      );
    case 'crown':
      return (
        <group position={[0, top + 0.01, -0.02]}>
          <mesh geometry={geo.cylinder} material={toon(color, { emissive: '#3a2a00' })} scale={[0.1, 0.06, 0.1]} />
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2;
            return (
              <mesh key={i} geometry={geo.cone} material={toon(color, { emissive: '#3a2a00' })} position={[Math.sin(a) * 0.09, 0.06, Math.cos(a) * 0.09]} scale={[0.025, 0.06, 0.025]} />
            );
          })}
          <mesh geometry={geo.sphere} material={toon('#e0457b')} position={[0, 0.0, 0.1]} scale={0.018} />
        </group>
      );
    case 'scarf':
      return (
        <group position={[0, biped ? -0.2 : -0.17, biped ? 0 : -0.05]} rotation={[Math.PI / 2 + (biped ? 0 : 0.5), 0, 0]}>
          <mesh geometry={geo.torus} material={toon(color)} scale={[0.17, 0.17, 0.12]} castShadow />
          <mesh geometry={geo.sphere} material={toon(color)} position={[0.1, 0.13, 0.06]} scale={[0.04, 0.03, 0.09]} />
        </group>
      );
  }
}
