import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { dayPhase } from '../game/daynight';
import { useGameStore } from '../store/gameStore';

const tmp = new THREE.Color();
const SKY_DAY = new THREE.Color('#fbe9e1');
const SKY_NIGHT = new THREE.Color('#1b1f3a');
const SUN_DAY = new THREE.Color('#fff4e0');
const SUN_DUSK = new THREE.Color('#ffae6b');
const MOON = new THREE.Color('#8fa6ff');

/** Shared, smoothed lighting state (also read by the window). */
export const lightState = { daylight: 1, dark: 0, dusk: 0 };

/**
 * Soft hemisphere + sun light that follow the real time of day.
 * Turning the light off (pet asleep) darkens the room smoothly.
 */
export function Lighting() {
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const scene = useThree((s) => s.scene);
  const phaseTimer = useRef({ t: 999, phase: dayPhase(new Date()) });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const pt = phaseTimer.current;
    pt.t += dt;
    if (pt.t > 10) {
      pt.t = 0;
      pt.phase = dayPhase(new Date());
    }
    const { daylight, dusk, sunProgress } = pt.phase;
    const lightsOff = !!useGameStore.getState().pet?.asleep;

    const k = 1 - Math.exp(-2 * dt);
    lightState.daylight += (daylight - lightState.daylight) * k;
    lightState.dusk += (dusk - lightState.dusk) * k;
    lightState.dark += ((lightsOff ? 1 : 0) - lightState.dark) * k;

    const day = lightState.daylight;
    const dark = lightState.dark;
    // Indoor light is on at night unless the pet sleeps
    const indoor = (1 - day) * (1 - dark);

    if (hemi.current) {
      hemi.current.intensity = (0.55 + 0.75 * day + 0.6 * indoor) * (1 - 0.65 * dark);
      hemi.current.color.copy(SUN_DAY).lerp(MOON, (1 - day) * dark);
    }
    if (sun.current) {
      const a = sunProgress * Math.PI;
      sun.current.position.set(Math.cos(a) * -4, 3 + Math.sin(a) * 3, 3);
      sun.current.intensity = 0.4 + 1.6 * day * (1 - 0.6 * dark) + 0.3 * (1 - day) * (1 - dark);
      sun.current.color.copy(SUN_DAY).lerp(SUN_DUSK, lightState.dusk * 0.8).lerp(MOON, (1 - day) * 0.8);
    }
    if (lamp.current) {
      lamp.current.intensity = indoor * 6 + dark * 0.6;
      lamp.current.color.set(dark > 0.5 ? '#ffb070' : '#ffe2b8');
    }
    if (scene.background instanceof THREE.Color) {
      tmp.copy(SKY_DAY).lerp(SKY_NIGHT, Math.max(1 - day, dark * 0.85));
      scene.background.copy(tmp);
    }
  });

  return (
    <>
      <color attach="background" args={['#fbe9e1']} />
      <hemisphereLight ref={hemi} args={['#fff4e0', '#c9a38a', 1]} />
      <directionalLight
        ref={sun}
        castShadow
        position={[-3, 5, 3]}
        intensity={1.6}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      {/* Ceiling lamp / night light */}
      <pointLight ref={lamp} position={[0, 2.6, 0.3]} distance={9} decay={1.6} intensity={0} />
    </>
  );
}
