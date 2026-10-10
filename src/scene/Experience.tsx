import { PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useState } from 'react';
import * as THREE from 'three';
import type { SpeciesId } from '../game/types';
import { Pet } from '../pets/Pet';
import { CameraRig } from './CameraRig';
import { Lighting } from './Lighting';
import { ParticleSystem } from './ParticleSystem';
import { Props } from './Props';
import { Room } from './Room';

interface Props3D {
  species: SpeciesId;
  preview?: boolean;
}

/** The full 3D scene. */
export function Experience({ species, preview }: Props3D) {
  const [dpr, setDpr] = useState(Math.min(2, window.devicePixelRatio));
  return (
    <Canvas
      shadows={{ type: THREE.PCFSoftShadowMap }}
      dpr={dpr}
      camera={{ position: [0, 2.3, 4.7], fov: 45, near: 0.1, far: 50 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      className="touch-none"
    >
      {/* Lower the resolution on slow devices to keep 60 fps */}
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(1, d - 0.5))}
        onIncline={() => setDpr((d) => Math.min(2, window.devicePixelRatio, d + 0.25))}
      />
      <Lighting />
      <Room />
      <Pet key={`${species}-${preview ? 'p' : 'g'}`} species={species} preview={preview} />
      <Props />
      <ParticleSystem />
      <CameraRig />
    </Canvas>
  );
}
