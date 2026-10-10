import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { FoodId, Poop } from '../game/types';
import { fx } from '../pets/fx';
import { props } from '../pets/props';
import { useGameStore } from '../store/gameStore';
import { SPOTS } from './layout';
import { toon } from './toon';

/** All transient props driven by pet behaviours. */
export function Props() {
  return (
    <>
      <FoodInBowl />
      <Ball />
      <LaserDot />
      <Feather />
      <Poops />
    </>
  );
}

function FoodModel({ food }: { food: FoodId }) {
  switch (food) {
    case 'kibble':
      return (
        <group>
          {Array.from({ length: 9 }, (_, i) => {
            const a = i * 2.4;
            const r = (i % 3) * 0.05;
            return (
              <mesh key={i} position={[Math.cos(a) * r, 0.04 + (i > 5 ? 0.04 : 0), Math.sin(a) * r]} material={toon('#b9824d')}>
                <sphereGeometry args={[0.045, 8, 6]} />
              </mesh>
            );
          })}
        </group>
      );
    case 'fish':
      return (
        <group position={[0, 0.06, 0]} rotation={[0, 0.5, 0]}>
          <mesh scale={[0.16, 0.07, 0.06]} material={toon('#8fb8de')}>
            <sphereGeometry args={[1, 14, 10]} />
          </mesh>
          <mesh position={[-0.17, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.07, 0.07, 0.02]} material={toon('#6d9cc8')}>
            <coneGeometry args={[1, 1, 3]} />
          </mesh>
          <mesh position={[0.1, 0.02, 0.05]} scale={0.012} material={toon('#222')}>
            <sphereGeometry args={[1, 6, 6]} />
          </mesh>
        </group>
      );
    case 'meat':
      return (
        <group position={[0, 0.07, 0]} rotation={[0, 0, 0.3]}>
          <mesh scale={[0.11, 0.09, 0.09]} material={toon('#c4553d')}>
            <sphereGeometry args={[1, 14, 10]} />
          </mesh>
          <mesh position={[0.15, -0.03, 0]} rotation={[0, 0, Math.PI / 2 + 0.2]} material={toon('#fff4e0')}>
            <cylinderGeometry args={[0.02, 0.02, 0.15, 8]} />
          </mesh>
          <mesh position={[0.22, -0.045, 0]} scale={0.032} material={toon('#fff4e0')}>
            <sphereGeometry args={[1, 8, 6]} />
          </mesh>
        </group>
      );
    case 'carrot':
      return (
        <group position={[0, 0.06, 0]} rotation={[0, 0, Math.PI / 2 - 0.2]}>
          <mesh material={toon('#f08a24')}>
            <coneGeometry args={[0.05, 0.25, 10]} />
          </mesh>
          <mesh position={[0, 0.15, 0]} material={toon('#5fb35f')}>
            <coneGeometry args={[0.04, 0.08, 6]} />
          </mesh>
        </group>
      );
    case 'berries':
      return (
        <group position={[0, 0.05, 0]}>
          {[
            [0, 0, 0],
            [0.06, 0, 0.03],
            [-0.05, 0, 0.04],
            [0.01, 0.05, 0.01],
            [-0.03, 0, -0.05],
          ].map(([x, y, z], i) => (
            <mesh key={i} position={[x, y, z]} material={toon('#5b5fc7')}>
              <sphereGeometry args={[0.04, 10, 8]} />
            </mesh>
          ))}
        </group>
      );
    case 'cake':
      return (
        <group position={[0, 0.07, 0]}>
          <mesh material={toon('#fff1d6')}>
            <cylinderGeometry args={[0.1, 0.1, 0.1, 3]} />
          </mesh>
          <mesh position={[0, 0.06, 0]} material={toon('#f6c1d0')}>
            <cylinderGeometry args={[0.105, 0.105, 0.03, 3]} />
          </mesh>
          <mesh position={[0, 0.1, 0]} material={toon('#e0322b')}>
            <sphereGeometry args={[0.025, 8, 6]} />
          </mesh>
        </group>
      );
    case 'chili':
      return (
        <group position={[0, 0.06, 0]} rotation={[0, 0, 1.2]}>
          <mesh material={toon('#e0322b')}>
            <capsuleGeometry args={[0.035, 0.14, 4, 8]} />
          </mesh>
          <mesh position={[0, 0.11, 0]} material={toon('#5fb35f')}>
            <cylinderGeometry args={[0.012, 0.012, 0.05, 6]} />
          </mesh>
        </group>
      );
    case 'medicine':
      return (
        <group position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
          <mesh position={[0, 0.03, 0]} material={toon('#f25c8a')}>
            <capsuleGeometry args={[0.03, 0.05, 4, 8]} />
          </mesh>
          <mesh position={[0, -0.03, 0]} material={toon('#ffffff')}>
            <capsuleGeometry args={[0.03, 0.05, 4, 8]} />
          </mesh>
        </group>
      );
  }
}

function FoodInBowl() {
  const group = useRef<THREE.Group>(null);
  const [food, setFood] = useState<FoodId>('kibble');
  const scale = useRef(0);
  useFrame((_, delta) => {
    if (props.food.food !== food) setFood(props.food.food);
    const target = props.food.visible ? props.food.amount : 0;
    scale.current += (target - scale.current) * (1 - Math.exp(-10 * delta));
    if (group.current) {
      group.current.visible = scale.current > 0.02;
      group.current.scale.setScalar(scale.current);
    }
  });
  const { at } = SPOTS.bowl;
  return (
    <group ref={group} position={[at.x, 0.06, at.z]} visible={false}>
      <FoodModel food={food} />
    </group>
  );
}

function Ball() {
  const mesh = useRef<THREE.Group>(null);
  const last = useRef(new THREE.Vector3());
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    m.visible = props.ball.visible;
    if (!m.visible) return;
    m.position.set(props.ball.x, props.ball.y, props.ball.z);
    const moved = m.position.distanceTo(last.current);
    m.rotation.x += moved * 6;
    last.current.copy(m.position);
  });
  return (
    <group ref={mesh} visible={false}>
      <mesh material={toon('#f25c8a')} castShadow>
        <sphereGeometry args={[0.12, 18, 14]} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} material={toon('#ffe066')}>
        <torusGeometry args={[0.118, 0.022, 6, 24]} />
      </mesh>
    </group>
  );
}

function LaserDot() {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    g.visible = props.laser.visible;
    g.position.set(props.laser.x, 0.012, props.laser.z);
    const s = 1 + Math.sin(state.clock.elapsedTime * 20) * 0.15;
    g.scale.setScalar(s);
  });
  return (
    <group ref={group} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.035, 16]} />
        <meshBasicMaterial color="#ff2a2a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[0.1, 16]} />
        <meshBasicMaterial color="#ff4a4a" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Feather() {
  const group = useRef<THREE.Group>(null);
  const stick = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    g.visible = props.feather.visible;
    if (!g.visible) return;
    g.position.set(props.feather.x, props.feather.y, props.feather.z);
    g.rotation.z = Math.sin(state.clock.elapsedTime * 6) * 0.4;
    if (stick.current) {
      // String hanging from above
      const len = 2.6 - props.feather.y;
      stick.current.scale.y = len;
      stick.current.position.y = len / 2 + 0.12;
    }
  });
  return (
    <group ref={group} visible={false}>
      <mesh scale={[0.05, 0.16, 0.02]} material={toon('#ff8fb8')} castShadow>
        <sphereGeometry args={[1, 10, 8]} />
      </mesh>
      <mesh position={[0.04, -0.06, 0]} rotation={[0, 0, 0.6]} scale={[0.035, 0.11, 0.015]} material={toon('#b48cff')}>
        <sphereGeometry args={[1, 10, 8]} />
      </mesh>
      <mesh ref={stick} material={toon('#5b5f7a')}>
        <cylinderGeometry args={[0.006, 0.006, 1, 4]} />
      </mesh>
    </group>
  );
}

/** Cartoon poop swirls. Tap to clean. */
const NO_POOPS: Poop[] = [];

function Poops() {
  const poops = useGameStore((s) => s.pet?.poops ?? NO_POOPS);
  return (
    <>
      {poops.map((p) => (
        <PoopItem key={p.id} poop={p} />
      ))}
    </>
  );
}

function PoopItem({ poop }: { poop: Poop }) {
  const group = useRef<THREE.Group>(null);
  const born = useRef(-1);
  const stinkTimer = useRef(Math.random() * 2);
  const [cleaning, setCleaning] = useState(false);

  useEffect(
    () => () => {
      document.body.style.cursor = 'auto';
    },
    [],
  );

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    if (born.current < 0) born.current = state.clock.elapsedTime;
    // Appears after the squat animation, then pops in
    const age = state.clock.elapsedTime - born.current - (Date.now() - poop.createdAt < 3000 ? 1.6 : 0);
    const k = Math.min(1, Math.max(0, age / 0.35));
    const pop = k < 1 ? Math.sin(k * Math.PI * 0.5) * (1 + 0.3 * Math.sin(k * Math.PI)) : 1;
    g.scale.setScalar(cleaning ? Math.max(0, g.scale.x - delta * 4) : pop);
    g.rotation.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
    stinkTimer.current -= delta;
    if (stinkTimer.current < 0 && k >= 1 && !cleaning) {
      stinkTimer.current = 1.4;
      fx.emit('stink', poop.x + (Math.random() - 0.5) * 0.1, 0.3, poop.z, 1);
    }
  });

  const clean = (e: { stopPropagation(): void }) => {
    e.stopPropagation();
    if (cleaning) return;
    setCleaning(true);
    fx.emit('star', poop.x, 0.2, poop.z, 8);
    fx.emit('bubble', poop.x, 0.15, poop.z, 6);
    setTimeout(() => useGameStore.getState().cleanPoop(poop.id), 250);
    document.body.style.cursor = 'auto';
  };

  return (
    <group
      ref={group}
      position={[poop.x, 0, poop.z]}
      scale={0}
      onPointerDown={clean}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      <mesh position={[0, 0.05, 0]} scale={[0.14, 0.06, 0.14]} material={toon('#8a5a3c')} castShadow>
        <sphereGeometry args={[1, 14, 10]} />
      </mesh>
      <mesh position={[0, 0.11, 0]} scale={[0.1, 0.05, 0.1]} material={toon('#9a6847')} castShadow>
        <sphereGeometry args={[1, 14, 10]} />
      </mesh>
      <mesh position={[0.01, 0.16, 0]} rotation={[0, 0, -0.3]} scale={[0.04, 0.06, 0.04]} material={toon('#a87452')}>
        <coneGeometry args={[1, 1, 10]} />
      </mesh>
      {/* Cute face */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.035, 0.11, 0.09]} scale={0.014} material={toon('#2a1c1f')}>
          <sphereGeometry args={[1, 6, 6]} />
        </mesh>
      ))}
      {/* Larger hit area */}
      <mesh position={[0, 0.12, 0]}>
        <sphereGeometry args={[0.25, 8, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
