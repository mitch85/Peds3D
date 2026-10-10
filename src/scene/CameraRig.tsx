import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { runtime } from '../pets/runtime';

const DOUBLE_TAP_MS = 320;
const FOCUS_DISTANCE = 3.4;

/**
 * Orbit camera with limits (swipe = rotate, pinch = zoom).
 * Double tap / double click eases the camera onto the pet.
 */
export function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const lastTap = useRef({ t: 0, x: 0, y: 0 });
  const focusTime = useRef(0);

  useEffect(() => {
    runtime.controls = controls.current;
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      const now = performance.now();
      const l = lastTap.current;
      if (now - l.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - l.x, e.clientY - l.y) < 40) {
        runtime.focusPet = true;
        focusTime.current = 0;
        l.t = 0;
      } else {
        lastTap.current = { t: now, x: e.clientX, y: e.clientY };
      }
    };
    el.addEventListener('pointerdown', down);
    return () => {
      el.removeEventListener('pointerdown', down);
      runtime.controls = null;
    };
  }, [gl]);

  const goal = useRef(new THREE.Vector3());
  const offset = useRef(new THREE.Vector3());
  const shift = useRef(new THREE.Vector3());
  const dragging = useRef(false);
  const aspect = useThree((s) => s.size.width / s.size.height);

  // Portrait phones: wider field of view and a bit more distance so the room fits
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const portrait = aspect < 0.85;
    camera.fov = portrait ? 58 : 45;
    camera.updateProjectionMatrix();
    if (portrait && camera.position.z < 6) camera.position.set(0, 3.2, 6.4);
  }, [aspect, camera]);

  useFrame((_, delta) => {
    const c = controls.current;
    if (!c || !runtime.brain) return;

    // Gentle auto-follow so the pet stays in view when it walks to a corner
    if (!runtime.focusPet && !dragging.current) {
      const b = runtime.brain;
      const follow = aspect < 0.85 ? 0.85 : 0.35;
      goal.current.set(b.pos.x * follow, 0.5, b.pos.z * follow * 0.5);
      const k = 1 - Math.exp(-1.5 * delta);
      shift.current.copy(goal.current).sub(c.target).multiplyScalar(k);
      if (shift.current.lengthSq() > 1e-8) {
        c.target.add(shift.current);
        camera.position.add(shift.current);
        c.update();
      }
    }

    if (!runtime.focusPet) return;
    focusTime.current += delta;
    const b = runtime.brain;
    goal.current.set(b.pos.x, 0.45, b.pos.z);
    const k = 1 - Math.exp(-4 * delta);
    offset.current.copy(camera.position).sub(c.target);
    const len = offset.current.length();
    offset.current.setLength(len + (FOCUS_DISTANCE - len) * k);
    c.target.lerp(goal.current, k);
    camera.position.copy(c.target).add(offset.current);
    c.update();
    if (focusTime.current > 1.2) runtime.focusPet = false;
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={2.6}
      maxDistance={8}
      minPolarAngle={0.35}
      maxPolarAngle={1.38}
      minAzimuthAngle={-1}
      maxAzimuthAngle={1}
      target={[0, 0.5, 0]}
      onStart={() => {
        runtime.focusPet = false;
        dragging.current = true;
      }}
      onEnd={() => {
        dragging.current = false;
      }}
    />
  );
}
