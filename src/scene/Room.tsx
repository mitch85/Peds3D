import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { lightState } from './Lighting';
import { ROOM, SPOTS } from './layout';
import { toon } from './toon';

const W = ROOM.width;
const D = ROOM.depth;
const H = 3;

function floorTexture(ice: boolean) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d')!;
  if (ice) {
    ctx.fillStyle = '#dff3ff';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 160, y + (Math.random() - 0.5) * 160);
      ctx.stroke();
    }
  } else {
    const colors = ['#e9c49c', '#e2b98f', '#edcaa5', '#e5bf95'];
    const plank = 64;
    for (let row = 0; row < 512 / plank; row++) {
      let x = row % 2 === 0 ? 0 : -128;
      while (x < 512) {
        const len = 200 + Math.random() * 120;
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.fillRect(x, row * plank, len, plank);
        ctx.strokeStyle = 'rgba(150,100,60,.35)';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, row * plank, len, plank);
        x += len;
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1.6);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function Room() {
  const decor = useGameStore((s) => s.equipped.decor);
  const ice = decor.includes('iceRoom');
  const floorTex = useMemo(() => floorTexture(ice), [ice]);
  const wall = ice ? '#d6efff' : '#fbe5d0';
  const wainscot = ice ? '#a9d8f2' : '#f2c2ab';

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshToonMaterial map={floorTex} />
      </mesh>
      {/* Floor continues towards the camera so portrait screens never see the void */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, D / 2 + 2]} receiveShadow>
        <planeGeometry args={[W + 8, 4]} />
        <meshToonMaterial map={floorTex} />
      </mesh>

      {/* Walls: single sided so the camera can look through them from outside */}
      <Wall position={[0, H / 2, -D / 2]} rotation={[0, 0, 0]} width={W} color={wall} wainscot={wainscot} />
      <Wall position={[-W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} width={D} color={wall} wainscot={wainscot} />
      <Wall position={[W / 2, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} width={D} color={wall} wainscot={wainscot} />

      <Window />
      <Shelf />
      <FoodCorner />
      <LitterBox />
      <Bed />
      <ToyBasket />

      {decor.includes('rug') && <Rug />}
      {decor.includes('plant') && <Plant />}
      {decor.includes('painting') && <Painting />}
      {decor.includes('lamp') && <FloorLamp />}
      {ice && <IceDecor />}
    </group>
  );
}

function Wall({ position, rotation, width, color, wainscot }: { position: [number, number, number]; rotation: [number, number, number]; width: number; color: string; wainscot: string }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh receiveShadow material={toon(color)}>
        <planeGeometry args={[width, H]} />
      </mesh>
      <mesh position={[0, -H / 2 + 0.4, 0.005]} receiveShadow material={toon(wainscot)}>
        <planeGeometry args={[width, 0.8]} />
      </mesh>
      <mesh position={[0, -H / 2 + 0.8, 0.01]} material={toon('#ffffff')}>
        <planeGeometry args={[width, 0.05]} />
      </mesh>
    </group>
  );
}

/** Window on the back wall that shows the real time of day. */
function Window() {
  const glass = useRef<THREE.MeshBasicMaterial>(null);
  const sun = useRef<THREE.Mesh>(null);
  const stars = useRef<THREE.Group>(null);
  const day = useMemo(() => new THREE.Color('#9fd8ff'), []);
  const dusk = useMemo(() => new THREE.Color('#ffb27a'), []);
  const night = useMemo(() => new THREE.Color('#1d2452'), []);
  const starPositions = useMemo(
    () => Array.from({ length: 10 }, () => [(Math.random() - 0.5) * 1.3, (Math.random() - 0.5) * 0.9] as const),
    [],
  );

  useFrame(() => {
    if (!glass.current) return;
    const { daylight, dusk: d } = lightState;
    glass.current.color.copy(night).lerp(day, daylight).lerp(dusk, d * 0.6);
    if (sun.current) {
      (sun.current.material as THREE.MeshBasicMaterial).color.set(daylight > 0.5 ? '#fff1a8' : '#f4f1ff');
      sun.current.position.y = -0.1 + daylight * 0.3;
    }
    if (stars.current) stars.current.visible = daylight < 0.4;
  });

  return (
    <group position={[0.6, 1.75, -D / 2 + 0.02]}>
      <mesh>
        <planeGeometry args={[1.5, 1.05]} />
        <meshBasicMaterial ref={glass} color="#9fd8ff" />
      </mesh>
      <mesh ref={sun} position={[0.35, 0.15, 0.01]}>
        <circleGeometry args={[0.13, 20]} />
        <meshBasicMaterial color="#fff1a8" />
      </mesh>
      <group ref={stars}>
        {starPositions.map(([x, y], i) => (
          <mesh key={i} position={[x, y, 0.01]}>
            <circleGeometry args={[0.015, 6]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        ))}
      </group>
      {/* Frame */}
      {[
        [0, 0.55, 1.65, 0.08],
        [0, -0.55, 1.65, 0.08],
        [-0.79, 0, 0.08, 1.15],
        [0.79, 0, 0.08, 1.15],
        [0, 0, 0.05, 1.05],
        [0, 0, 1.5, 0.05],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.03]} material={toon('#ffffff')}>
          <boxGeometry args={[w, h, 0.06]} />
        </mesh>
      ))}
      {/* Sill + curtains */}
      <mesh position={[0, -0.62, 0.08]} material={toon('#ffffff')} castShadow>
        <boxGeometry args={[1.8, 0.06, 0.2]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.98, -0.05, 0.08]} material={toon('#f7a8c0')} castShadow>
          <capsuleGeometry args={[0.1, 1.1, 4, 10]} />
        </mesh>
      ))}
    </group>
  );
}

function Shelf() {
  const books = ['#7fb8d6', '#f6a96b', '#9fd88f', '#c79ad8', '#f7d06b'];
  return (
    <group position={[-W / 2 + 0.02, 1.7, 0.1]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0, 0.12]} material={toon('#d9a066')} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.06, 0.25]} />
      </mesh>
      {books.map((c, i) => (
        <mesh key={i} position={[-0.45 + i * 0.13, 0.16 + (i % 2) * 0.02, 0.12]} rotation={[0, 0, i === 4 ? 0.3 : 0]} material={toon(c)} castShadow>
          <boxGeometry args={[0.1, 0.28 + (i % 3) * 0.04, 0.2]} />
        </mesh>
      ))}
    </group>
  );
}

function FoodCorner() {
  const { at } = SPOTS.bowl;
  return (
    <group position={[at.x, 0, at.z]}>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} material={toon('#f7a8c0')} receiveShadow>
        <circleGeometry args={[0.42, 28]} />
      </mesh>
      {/* Bowl */}
      <mesh position={[0, 0.07, 0]} material={toon('#6cc3f5')} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.18, 0.14, 24, 1, true]} />
      </mesh>
      <mesh position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]} material={toon('#9ad8fa')}>
        <torusGeometry args={[0.24, 0.025, 8, 28]} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={toon('#4a9cc9')}>
        <circleGeometry args={[0.18, 24]} />
      </mesh>
      {/* Water bowl */}
      <group position={[0.05, 0, -0.55]}>
        <mesh position={[0, 0.06, 0]} material={toon('#f6a96b')} castShadow>
          <cylinderGeometry args={[0.18, 0.15, 0.12, 20, 1, true]} />
        </mesh>
        <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]} material={toon('#8fd3ff', { opacity: 0.85 })}>
          <circleGeometry args={[0.17, 20]} />
        </mesh>
      </group>
    </group>
  );
}

function LitterBox() {
  const { at } = SPOTS.litter;
  const c = '#8fc9a3';
  return (
    <group position={[at.x, 0, at.z]}>
      <mesh position={[0, 0.03, 0]} material={toon(c)} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.06, 0.75]} />
      </mesh>
      {[
        [0, 0.1, 0.36, 0.95, 0.04],
        [0, 0.1, -0.36, 0.95, 0.04],
        [0.46, 0.1, 0, 0.04, 0.75],
        [-0.46, 0.1, 0, 0.04, 0.75],
      ].map(([x, y, z, w, d], i) => (
        <mesh key={i} position={[x, y, z]} material={toon(c)} castShadow>
          <boxGeometry args={[w, 0.16, d]} />
        </mesh>
      ))}
      <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]} material={toon('#f3e2b8')} receiveShadow>
        <planeGeometry args={[0.88, 0.68]} />
      </mesh>
      {/* Little sign */}
      <group position={[0.35, 0.45, -0.4]}>
        <mesh position={[0, -0.18, 0]} material={toon('#ffffff')}>
          <cylinderGeometry args={[0.012, 0.012, 0.36, 6]} />
        </mesh>
        <RoundedBox args={[0.24, 0.18, 0.03]} radius={0.03} material={toon('#ffffff')} />
        <mesh position={[0, 0, 0.02]} material={toon('#6cc3f5')}>
          <circleGeometry args={[0.05, 14]} />
        </mesh>
      </group>
    </group>
  );
}

function Bed() {
  const { at } = SPOTS.bed;
  return (
    <group position={[at.x, 0, at.z]}>
      <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} material={toon('#c79ad8')} castShadow receiveShadow>
        <torusGeometry args={[0.52, 0.16, 12, 32]} />
      </mesh>
      <mesh position={[0, 0.06, 0]} material={toon('#f4d4f5')} receiveShadow>
        <cylinderGeometry args={[0.52, 0.52, 0.1, 32]} />
      </mesh>
      {/* Pillow */}
      <mesh position={[-0.15, 0.15, -0.25]} rotation={[0.3, 0.4, 0]} scale={[0.22, 0.08, 0.14]} material={toon('#ffffff')} castShadow>
        <sphereGeometry args={[1, 16, 12]} />
      </mesh>
    </group>
  );
}

function ToyBasket() {
  const { at } = SPOTS.toys;
  return (
    <group position={[at.x, 0, at.z]}>
      <mesh position={[0, 0.17, 0]} material={toon('#d9a066')} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.25, 0.34, 20, 1, true]} />
      </mesh>
      <mesh position={[0, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]} material={toon('#b9824d')}>
        <torusGeometry args={[0.3, 0.025, 6, 24]} />
      </mesh>
      <mesh position={[0.08, 0.36, 0.02]} material={toon('#f25c8a')} castShadow>
        <sphereGeometry args={[0.11, 16, 12]} />
      </mesh>
      <mesh position={[-0.1, 0.36, -0.05]} rotation={[0, 0, 0.6]} material={toon('#ffe066')} castShadow>
        <capsuleGeometry args={[0.04, 0.22, 4, 8]} />
      </mesh>
    </group>
  );
}

function Rug() {
  return (
    <group position={[0, 0.006, 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh material={toon('#b48cff')} receiveShadow>
        <circleGeometry args={[1.25, 40]} />
      </mesh>
      <mesh position={[0, 0, 0.002]} material={toon('#d6c1ff')} receiveShadow>
        <ringGeometry args={[0.7, 0.9, 40]} />
      </mesh>
    </group>
  );
}

function Plant() {
  return (
    <group position={[-2.55, 0, 1.75]}>
      <mesh position={[0, 0.2, 0]} material={toon('#e98b4f')} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.4, 16]} />
      </mesh>
      {[
        [0, 0.65, 0, 0.28],
        [0.15, 0.85, 0.05, 0.2],
        [-0.14, 0.8, -0.05, 0.22],
        [0.02, 1.0, -0.02, 0.17],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} material={toon(i % 2 ? '#6fbf73' : '#58a65f')} castShadow>
          <icosahedronGeometry args={[r, 1]} />
        </mesh>
      ))}
    </group>
  );
}

function Painting() {
  return (
    <group position={[-1.5, 1.8, -D / 2 + 0.03]}>
      <RoundedBox args={[0.9, 0.7, 0.05]} radius={0.02} material={toon('#d9a066')} />
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[0.76, 0.56]} />
        <meshBasicMaterial color="#bfe6ff" />
      </mesh>
      <mesh position={[0, -0.16, 0.035]}>
        <planeGeometry args={[0.76, 0.24]} />
        <meshBasicMaterial color="#8fd18f" />
      </mesh>
      <mesh position={[0.2, 0.1, 0.04]}>
        <circleGeometry args={[0.08, 16]} />
        <meshBasicMaterial color="#ffd84a" />
      </mesh>
      <mesh position={[-0.15, -0.02, 0.04]}>
        <circleGeometry args={[0.14, 3]} />
        <meshBasicMaterial color="#7d9bb8" />
      </mesh>
    </group>
  );
}

function FloorLamp() {
  const light = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (light.current) light.current.intensity = (1 - lightState.daylight) * 2.5 + lightState.dark * 0.8;
  });
  return (
    <group position={[2.6, 0, 0.2]}>
      <mesh position={[0, 0.02, 0]} material={toon('#5b5f7a')}>
        <cylinderGeometry args={[0.18, 0.2, 0.04, 16]} />
      </mesh>
      <mesh position={[0, 0.75, 0]} material={toon('#5b5f7a')} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 1.5, 8]} />
      </mesh>
      <mesh position={[0, 1.55, 0]} material={toon('#fff1c9', { emissive: '#7a5a20' })} castShadow>
        <cylinderGeometry args={[0.15, 0.28, 0.32, 20, 1, true]} />
      </mesh>
      <pointLight ref={light} position={[0, 1.45, 0]} color="#ffcf8a" distance={4} decay={1.5} intensity={0} />
    </group>
  );
}

/** Ice room theme: little ice crystals and falling snow. */
function IceDecor() {
  const snow = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 120;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * W;
      pos[i * 3 + 1] = Math.random() * H;
      pos[i * 3 + 2] = (Math.random() - 0.5) * D;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useFrame((_, delta) => {
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] -= delta * 0.25;
      arr[i] += Math.sin(arr[i + 1] * 3 + i) * delta * 0.05;
      if (arr[i + 1] < 0) arr[i + 1] = H;
    }
    attr.needsUpdate = true;
  });
  return (
    <group>
      <points ref={snow} geometry={geometry}>
        <pointsMaterial color="#ffffff" size={0.05} transparent opacity={0.9} depthWrite={false} />
      </points>
      {[
        [2.5, -1.8, 0.5],
        [2.2, -1.9, 0.35],
        [-2.6, 1.0, 0.3],
      ].map(([x, z, h], i) => (
        <mesh key={i} position={[x, h / 2, z]} material={toon('#bfe8ff', { opacity: 0.85 })} castShadow>
          <coneGeometry args={[0.12, h, 5]} />
        </mesh>
      ))}
    </group>
  );
}
