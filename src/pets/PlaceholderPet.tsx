import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { PetConfig } from '../game/pets.config';
import type { AccessoryId, LifeStage } from '../game/types';
import { toon } from '../scene/toon';
import { Accessory } from './Accessory';
import type { RigHandle } from './rig';

interface Props {
  cfg: PetConfig;
  stage: LifeStage;
  accessory: AccessoryId | null;
}

type G = THREE.Group | null;

/**
 * Cute placeholder pet built from primitives. Fully procedurally animated from the brain's
 * blended pose, so every pet in pets.config.ts is playable without any 3D asset.
 */
export const PlaceholderPet = forwardRef<RigHandle, Props>(function PlaceholderPet({ cfg, stage, accessory }, ref) {
  const look = cfg.look;
  const biped = look.legs === 2;
  const L = look.bodyLength;

  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const earL = useRef<THREE.Group>(null);
  const earR = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Group>(null);
  const eyeR = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const tail = useRef<THREE.Group>(null);
  const legs = useRef<G[]>([]);
  const wings = useRef<G[]>([]);
  const phase = useRef({ leg: 0, tail: 0, wing: 0 });

  const mats = useMemo(
    () => ({
      body: toon(look.body),
      belly: toon(look.belly),
      accent: toon(look.accent),
      eye: toon('#2a1c1f'),
      white: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      cheek: toon('#ff9db3', { opacity: 0.75 }),
      nose: toon(cfg.id === 'dog' ? '#3a2a24' : '#f07c93'),
      mouth: toon('#7a2c3a'),
      beak: toon('#f5a742'),
    }),
    [look, cfg.id],
  );

  const geo = useMemo(
    () => ({
      sphere: new THREE.SphereGeometry(1, 24, 18),
      lowSphere: new THREE.SphereGeometry(1, 12, 10),
      cone: new THREE.ConeGeometry(1, 1, 16),
      capsule: new THREE.CapsuleGeometry(1, 1, 6, 12),
      cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
    }),
    [],
  );

  const headScale = stage === 'baby' ? 1.18 : stage === 'child' ? 1.08 : 1;

  // Body dimensions
  const bodyY = biped ? 0.48 : 0.42;
  const headPos: [number, number, number] = biped ? [0, 0.98, 0.02] : [0, 0.72, 0.3 * L];
  const tailPos: [number, number, number] = biped ? [0, 0.18, -0.26] : [0, 0.5, -0.34 * L];

  useImperativeHandle(ref, () => ({
    apply(brain, dt) {
      const p = brain.pose;
      const ph = phase.current;
      ph.leg += p.legSpeed * dt;
      ph.tail += p.tailWagSpeed * dt;
      ph.wing += (6 + p.wingFlap * 14) * dt;

      if (root.current) {
        const drop = p.crouch * (biped ? 0.12 : 0.2);
        root.current.position.y = Math.max(-0.25, p.bodyY - drop);
        root.current.rotation.set(p.bodyPitch, p.bodyYaw, p.bodyRoll);
        const sq = p.squash;
        root.current.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);
      }
      if (head.current) {
        head.current.rotation.set(p.headPitch, p.headYaw, p.headRoll);
      }
      // Eyes: blink / squint / wide
      const open = Math.max(0.08, Math.min(1.25, p.eyeOpen));
      eyeL.current?.scale.set(1, open, 1);
      eyeR.current?.scale.set(1, open, 1);
      if (mouth.current) mouth.current.scale.set(0.05, 0.015 + 0.045 * p.mouthOpen, 0.03);

      // Ears
      const droop = p.earDroop;
      if (earL.current && earR.current) {
        switch (look.ears) {
          case 'pointy':
            earL.current.rotation.set(-droop * 0.5, 0, 0.25 + droop * 0.9);
            earR.current.rotation.set(-droop * 0.5, 0, -0.25 - droop * 0.9);
            break;
          case 'long':
            earL.current.rotation.set(-0.15 - droop * 1.25, 0, 0.12 + droop * 0.3);
            earR.current.rotation.set(-0.15 - droop * 1.25, 0, -0.12 - droop * 0.3);
            break;
          case 'floppy': {
            const flap = Math.sin(ph.leg) * p.legSwing * 0.3;
            earL.current.rotation.set(0, 0, -0.35 + droop * 0.35 + flap);
            earR.current.rotation.set(0, 0, 0.35 - droop * 0.35 - flap);
            break;
          }
          default:
            break;
        }
      }

      // Legs (diagonal pairs move together)
      const swing = Math.sin(ph.leg) * p.legSwing;
      const legScale = 1 - p.crouch * 0.65;
      legs.current.forEach((leg, i) => {
        if (!leg) return;
        if (biped) {
          // feet: lift alternately
          const s = i === 0 ? swing : -swing;
          leg.position.y = Math.max(0, s) * 0.08;
          leg.rotation.x = -s * 0.4;
          return;
        }
        const front = i < 2;
        const sign = i === 0 || i === 3 ? 1 : -1;
        leg.rotation.x = swing * sign - (front ? p.frontPaw * 0.9 : 0);
        leg.scale.y = legScale;
      });

      // Wings / flippers
      wings.current.forEach((w, i) => {
        if (!w) return;
        const side = i === 0 ? 1 : -1;
        if (look.extras.includes('flippers')) {
          w.rotation.z = side * (0.15 + p.frontPaw * 0.6 + Math.abs(Math.sin(ph.leg)) * p.legSwing * 0.6 + p.wingFlap * 0.4 * Math.abs(Math.sin(ph.wing)));
        } else {
          w.rotation.z = side * (0.5 + p.wingFlap * 0.5 * Math.sin(ph.wing) + 0.08 * Math.sin(ph.wing * 0.3));
        }
      });

      // Tail
      if (tail.current) {
        tail.current.rotation.y = Math.sin(ph.tail) * p.tailWag;
        tail.current.rotation.x = p.tailLift;
      }
    },
  }));

  const S = (r: [number, number, number]) => r; // readability helper for scale tuples

  return (
    <group ref={root}>
      {/* Body */}
      <mesh geometry={geo.sphere} material={mats.body} position={[0, bodyY, 0]} scale={biped ? S([0.31, 0.43, 0.28]) : S([0.3, 0.27, 0.36 * L])} castShadow />
      <mesh
        geometry={geo.sphere}
        material={mats.belly}
        position={biped ? [0, bodyY - 0.04, 0.08] : [0, bodyY - 0.06, 0.06]}
        scale={biped ? S([0.25, 0.36, 0.22]) : S([0.24, 0.2, 0.3 * L])}
      />

      {/* Dragon back spikes */}
      {look.extras.includes('spikes') &&
        [-0.15, 0.02, 0.18].map((z, i) => (
          <mesh key={i} geometry={geo.cone} material={mats.accent} position={[0, bodyY + 0.25, z * L]} scale={[0.05, 0.12, 0.05]} rotation={[-0.3, 0, 0]} />
        ))}

      {/* Legs */}
      {biped
        ? [-1, 1].map((side, i) => (
            <group key={i} ref={(el) => (legs.current[i] = el)} position={[side * 0.12, 0.03, 0.1]}>
              <mesh geometry={geo.sphere} material={mats.beak} scale={[0.08, 0.035, 0.13]} castShadow />
            </group>
          ))
        : [
            [-0.16, 0.21],
            [0.16, 0.21],
            [-0.16, -0.21],
            [0.16, -0.21],
          ].map(([x, z], i) => (
            <group key={i} ref={(el) => (legs.current[i] = el)} position={[x, 0.3, z * L]}>
              <mesh geometry={geo.capsule} material={mats.body} position={[0, -0.15, 0]} scale={[0.075, 0.1, 0.075]} castShadow />
              <mesh geometry={geo.lowSphere} material={mats.belly} position={[0, -0.27, 0.02]} scale={[0.08, 0.05, 0.09]} />
            </group>
          ))}

      {/* Wings (dragon) or flippers (penguin) */}
      {look.extras.includes('wings') &&
        [1, -1].map((side, i) => (
          <group key={i} ref={(el) => (wings.current[i] = el)} position={[side * 0.18, bodyY + 0.18, -0.05]}>
            <mesh geometry={geo.sphere} material={mats.accent} position={[side * 0.18, 0.04, 0]} scale={[0.2, 0.025, 0.13]} castShadow />
          </group>
        ))}
      {look.extras.includes('flippers') &&
        [1, -1].map((side, i) => (
          <group key={i} ref={(el) => (wings.current[i] = el)} position={[side * 0.27, bodyY + 0.2, 0]}>
            <mesh geometry={geo.sphere} material={mats.body} position={[side * 0.03, -0.17, 0]} scale={[0.05, 0.2, 0.1]} castShadow />
          </group>
        ))}

      {/* Tail */}
      <group ref={tail} position={tailPos}>
        <Tail shape={look.tail} mats={mats} geo={geo} />
      </group>

      {/* Head */}
      <group position={headPos}>
        <group ref={head} scale={headScale}>
          <mesh geometry={geo.sphere} material={mats.body} scale={biped ? [0.24, 0.23, 0.23] : [0.27, 0.25, 0.25]} castShadow />
          {biped && <mesh geometry={geo.sphere} material={mats.belly} position={[0, -0.03, 0.08]} scale={[0.19, 0.17, 0.17]} />}

          {/* Eyes */}
          {[-1, 1].map((side, i) => (
            <group key={i} ref={i === 0 ? eyeL : eyeR} position={[side * 0.095, 0.035, biped ? 0.2 : 0.215]}>
              <mesh geometry={geo.lowSphere} material={mats.eye} scale={[0.052, 0.065, 0.04]} />
              <mesh geometry={geo.lowSphere} material={mats.white} position={[0.016, 0.022, 0.03]} scale={0.016} />
            </group>
          ))}

          {/* Cheeks */}
          {[-1, 1].map((side, i) => (
            <mesh key={i} geometry={geo.lowSphere} material={mats.cheek} position={[side * 0.16, -0.06, biped ? 0.15 : 0.17]} scale={[0.05, 0.03, 0.02]} />
          ))}

          {/* Snout / beak / nose */}
          {look.extras.includes('snout') && (
            <mesh geometry={geo.sphere} material={mats.belly} position={[0, -0.07, 0.2]} scale={[0.12, 0.09, 0.12]} />
          )}
          {look.extras.includes('beak') ? (
            <mesh geometry={geo.cone} material={mats.beak} position={[0, -0.03, 0.27]} rotation={[Math.PI / 2, 0, 0]} scale={[0.05, 0.12, 0.035]} />
          ) : (
            <mesh
              geometry={geo.lowSphere}
              material={mats.nose}
              position={look.extras.includes('snout') ? [0, -0.03, 0.315] : [0, -0.025, 0.25]}
              scale={[0.035, 0.025, 0.025]}
            />
          )}
          <mesh ref={mouth} geometry={geo.lowSphere} material={mats.mouth} position={look.extras.includes('snout') ? [0, -0.11, 0.3] : [0, -0.085, 0.235]} />

          {/* Whiskers */}
          {look.extras.includes('whiskers') &&
            [-1, 1].flatMap((side) =>
              [0.02, -0.02].map((dy, j) => (
                <mesh
                  key={`${side}${j}`}
                  geometry={geo.cylinder}
                  material={mats.eye}
                  position={[side * 0.16, -0.05 + dy, 0.2]}
                  rotation={[0, 0, Math.PI / 2 + side * dy * 4]}
                  scale={[0.004, 0.14, 0.004]}
                />
              )),
            )}

          {/* Ears */}
          <Ears shape={look.ears} left={earL} right={earR} mats={mats} geo={geo} />

          <Accessory id={accessory} biped={biped} />
        </group>
      </group>
    </group>
  );
});

interface PartProps {
  mats: Record<string, THREE.Material>;
  geo: Record<string, THREE.BufferGeometry>;
}

function Ears({ shape, left, right, mats, geo }: PartProps & { shape: PetConfig['look']['ears']; left: React.Ref<THREE.Group>; right: React.Ref<THREE.Group> }) {
  switch (shape) {
    case 'pointy':
      return (
        <>
          {[-1, 1].map((side) => (
            <group key={side} ref={side < 0 ? left : right} position={[side * 0.13, 0.17, -0.02]}>
              <mesh geometry={geo.cone} material={mats.body} position={[0, 0.08, 0]} scale={[0.085, 0.17, 0.06]} castShadow />
              <mesh geometry={geo.cone} material={mats.cheek} position={[0, 0.07, 0.018]} scale={[0.05, 0.12, 0.03]} />
            </group>
          ))}
        </>
      );
    case 'long':
      return (
        <>
          {[-1, 1].map((side) => (
            <group key={side} ref={side < 0 ? left : right} position={[side * 0.09, 0.19, -0.03]}>
              <mesh geometry={geo.capsule} material={mats.body} position={[0, 0.17, 0]} scale={[0.06, 0.13, 0.035]} castShadow />
              <mesh geometry={geo.capsule} material={mats.accent} position={[0, 0.17, 0.02]} scale={[0.035, 0.1, 0.02]} />
            </group>
          ))}
        </>
      );
    case 'floppy':
      return (
        <>
          {[-1, 1].map((side) => (
            <group key={side} ref={side < 0 ? left : right} position={[side * 0.2, 0.1, -0.02]}>
              <mesh geometry={geo.sphere} material={mats.accent} position={[side * 0.03, -0.12, 0]} scale={[0.06, 0.15, 0.1]} castShadow />
            </group>
          ))}
        </>
      );
    case 'horns':
      return (
        <>
          {[-1, 1].map((side) => (
            <group key={side} ref={side < 0 ? left : right} position={[side * 0.11, 0.19, -0.05]}>
              <mesh geometry={geo.cone} material={mats.belly} position={[0, 0.06, 0]} rotation={[-0.4, 0, side * -0.2]} scale={[0.04, 0.13, 0.04]} />
            </group>
          ))}
        </>
      );
    default:
      return (
        <>
          <group ref={left} />
          <group ref={right} />
        </>
      );
  }
}

function Tail({ shape, mats, geo }: PartProps & { shape: PetConfig['look']['tail'] }) {
  switch (shape) {
    case 'thin':
      return (
        <group rotation={[0.9, 0, 0]}>
          <mesh geometry={geo.capsule} material={mats.body} position={[0, 0, -0.18]} rotation={[Math.PI / 2, 0, 0]} scale={[0.04, 0.16, 0.04]} castShadow />
          <mesh geometry={geo.lowSphere} material={mats.accent} position={[0, 0, -0.36]} scale={0.045} />
        </group>
      );
    case 'wag':
      return (
        <group rotation={[0.7, 0, 0]}>
          <mesh geometry={geo.capsule} material={mats.body} position={[0, 0, -0.13]} rotation={[Math.PI / 2, 0, 0]} scale={[0.05, 0.1, 0.05]} castShadow />
          <mesh geometry={geo.lowSphere} material={mats.belly} position={[0, 0, -0.25]} scale={0.055} />
        </group>
      );
    case 'puff':
      return <mesh geometry={geo.sphere} material={mats.belly} position={[0, 0, -0.03]} scale={0.1} castShadow />;
    case 'spiked':
      return (
        <group rotation={[0.25, 0, 0]}>
          <mesh geometry={geo.cone} material={mats.body} position={[0, 0, -0.22]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.09, 0.45, 0.07]} castShadow />
          <mesh geometry={geo.cone} material={mats.accent} position={[0, 0, -0.47]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.06, 0.1, 0.03]} />
        </group>
      );
    default:
      return <mesh geometry={geo.cone} material={mats.body} position={[0, 0, -0.04]} rotation={[-Math.PI / 2 - 0.4, 0, 0]} scale={[0.08, 0.1, 0.04]} />;
  }
}
