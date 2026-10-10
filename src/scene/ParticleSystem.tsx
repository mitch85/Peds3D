import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { fx, type FxKind, type FxRequest } from '../pets/fx';

const POOL_SIZE = 160;

type Draw = (ctx: CanvasRenderingContext2D, s: number) => void;

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outer: number, inner: number) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

const DRAW: Record<FxKind, Draw> = {
  heart: (c, s) => {
    c.fillStyle = '#ff5c8a';
    c.beginPath();
    c.moveTo(s / 2, s * 0.85);
    c.bezierCurveTo(s * 0.05, s * 0.55, s * 0.1, s * 0.12, s / 2, s * 0.3);
    c.bezierCurveTo(s * 0.9, s * 0.12, s * 0.95, s * 0.55, s / 2, s * 0.85);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.7)';
    c.beginPath();
    c.ellipse(s * 0.33, s * 0.35, s * 0.07, s * 0.05, -0.6, 0, Math.PI * 2);
    c.fill();
  },
  zzz: (c, s) => {
    c.font = `900 ${s * 0.8}px Nunito, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = s * 0.08;
    c.strokeStyle = '#3d4c8a';
    c.strokeText('Z', s / 2, s / 2);
    c.fillStyle = '#dfe6ff';
    c.fillText('Z', s / 2, s / 2);
  },
  bubble: (c, s) => {
    const g = c.createRadialGradient(s * 0.4, s * 0.4, s * 0.05, s / 2, s / 2, s * 0.45);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.5, 'rgba(200,235,255,0.25)');
    g.addColorStop(0.9, 'rgba(170,220,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(s / 2, s / 2, s * 0.45, 0, Math.PI * 2);
    c.fill();
  },
  spark: (c, s) => {
    const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,200,1)');
    g.addColorStop(0.35, 'rgba(255,180,40,0.9)');
    g.addColorStop(1, 'rgba(255,80,0,0)');
    c.fillStyle = g;
    star(c, s / 2, s / 2, 4, s / 2, s * 0.15);
    c.fill();
  },
  drop: (c, s) => {
    c.fillStyle = '#7cc8ff';
    c.beginPath();
    c.arc(s / 2, s * 0.6, s * 0.3, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.8)';
    c.beginPath();
    c.arc(s * 0.42, s * 0.52, s * 0.08, 0, Math.PI * 2);
    c.fill();
  },
  star: (c, s) => {
    c.fillStyle = '#ffd84a';
    star(c, s / 2, s / 2, 5, s * 0.46, s * 0.2);
    c.fill();
    c.strokeStyle = '#fff6c4';
    c.lineWidth = s * 0.04;
    c.stroke();
  },
  crumb: (c, s) => {
    c.fillStyle = '#c08a52';
    c.beginPath();
    c.arc(s / 2, s / 2, s * 0.35, 0, Math.PI * 2);
    c.fill();
  },
  confetti: (c, s) => {
    c.fillStyle = '#ffffff';
    c.fillRect(s * 0.25, s * 0.15, s * 0.5, s * 0.7);
  },
  stink: (c, s) => {
    c.strokeStyle = 'rgba(140,190,90,0.9)';
    c.lineWidth = s * 0.09;
    c.lineCap = 'round';
    c.beginPath();
    for (let i = 0; i <= 20; i++) {
      const y = s * 0.9 - (i / 20) * s * 0.8;
      const x = s / 2 + Math.sin(i * 0.6) * s * 0.15;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
  },
};

const CONFETTI_COLORS = ['#ff6b9a', '#ffd84a', '#6cc3f5', '#7fdc8a', '#b48cff', '#ff9f43'];

interface Particle {
  sprite: THREE.Sprite;
  kind: FxKind;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
  wobble: number;
  seed: number;
}

function makeTextures(): Record<FxKind, THREE.Texture> {
  const out = {} as Record<FxKind, THREE.Texture>;
  (Object.keys(DRAW) as FxKind[]).forEach((k) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    DRAW[k](canvas.getContext('2d')!, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    out[k] = tex;
  });
  return out;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Pooled sprite particles for hearts, Zzz, bubbles, sparks, droplets, ... */
export function ParticleSystem() {
  const textures = useMemo(makeTextures, []);
  const { group, pool } = useMemo(() => {
    const group = new THREE.Group();
    const pool: Particle[] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      sprite.visible = false;
      sprite.renderOrder = 10;
      group.add(sprite);
      pool.push({ sprite, kind: 'heart', vel: new THREE.Vector3(), life: 0, maxLife: 0, size: 0.1, gravity: 0, wobble: 0, seed: 0 });
    }
    return { group, pool };
  }, []);

  useEffect(() => {
    let cursor = 0;
    const spawn = (req: FxRequest) => {
      for (let n = 0; n < req.count; n++) {
        // Prefer a free slot, otherwise recycle the oldest
        let p = pool.find((q) => q.life <= 0);
        if (!p) {
          p = pool[cursor];
          cursor = (cursor + 1) % pool.length;
        }
        const mat = p.sprite.material;
        mat.map = textures[req.kind];
        mat.color.set(req.kind === 'confetti' ? CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] : '#ffffff');
        mat.rotation = 0;
        mat.blending = req.kind === 'spark' ? THREE.AdditiveBlending : THREE.NormalBlending;
        mat.needsUpdate = true;
        p.kind = req.kind;
        p.sprite.position.set(req.x, req.y, req.z);
        p.sprite.visible = true;
        p.seed = Math.random() * 10;
        p.wobble = 0;
        p.gravity = 0;
        switch (req.kind) {
          case 'heart':
            p.vel.set(rnd(-0.25, 0.25), rnd(0.5, 0.8), rnd(-0.1, 0.1));
            p.maxLife = 1.5;
            p.size = rnd(0.14, 0.2);
            p.wobble = 0.3;
            break;
          case 'zzz':
            p.vel.set(rnd(0.12, 0.2), 0.3, 0);
            p.maxLife = 2.4;
            p.size = 0.12;
            p.wobble = 0.15;
            break;
          case 'bubble':
            p.vel.set(rnd(-0.15, 0.15), rnd(0.15, 0.4), rnd(-0.15, 0.15));
            p.maxLife = rnd(1.2, 2);
            p.size = rnd(0.1, 0.22);
            p.wobble = 0.2;
            break;
          case 'spark':
            p.vel.set(rnd(-0.8, 0.8), rnd(0.4, 1.2), rnd(-0.8, 0.8));
            p.maxLife = rnd(0.4, 0.7);
            p.size = rnd(0.07, 0.12);
            p.gravity = -2;
            break;
          case 'drop': {
            const a = Math.random() * Math.PI * 2;
            p.vel.set(Math.cos(a) * rnd(1, 1.8), rnd(0.5, 1.4), Math.sin(a) * rnd(1, 1.8));
            p.maxLife = 0.6;
            p.size = rnd(0.04, 0.07);
            p.gravity = -6;
            break;
          }
          case 'star':
            p.vel.set(rnd(-0.6, 0.6), rnd(0.5, 1), rnd(-0.6, 0.6));
            p.maxLife = 1;
            p.size = rnd(0.08, 0.13);
            p.gravity = -0.6;
            break;
          case 'crumb':
            p.vel.set(rnd(-0.4, 0.4), rnd(0.4, 0.9), rnd(-0.4, 0.4));
            p.maxLife = 0.5;
            p.size = 0.035;
            p.gravity = -5;
            break;
          case 'confetti':
            p.vel.set(rnd(-1.4, 1.4), rnd(1.5, 3), rnd(-1.4, 1.4));
            p.maxLife = rnd(1.6, 2.4);
            p.size = rnd(0.05, 0.08);
            p.gravity = -2.5;
            p.wobble = 0.6;
            break;
          case 'stink':
            p.vel.set(rnd(-0.05, 0.05), 0.25, 0);
            p.maxLife = 1.6;
            p.size = 0.13;
            p.wobble = 0.1;
            break;
        }
        p.life = p.maxLife;
        p.sprite.scale.setScalar(0.001);
      }
    };
    return fx.subscribe(spawn);
  }, [pool, textures]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime;
    for (const p of pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.sprite.visible = false;
        continue;
      }
      p.vel.y += p.gravity * dt;
      const s = p.sprite;
      s.position.addScaledVector(p.vel, dt);
      if (p.wobble) s.position.x += Math.sin(time * 5 + p.seed) * p.wobble * dt;
      if (s.position.y < 0.02 && p.gravity < 0) {
        s.position.y = 0.02;
        p.vel.set(0, 0, 0);
      }
      const age = 1 - p.life / p.maxLife; // 0 → 1
      const grow = Math.min(1, age * 6);
      const sizeMul = p.kind === 'zzz' ? 1 + age * 1.6 : 1;
      s.scale.setScalar(p.size * grow * sizeMul);
      const mat = s.material;
      mat.opacity = Math.min(1, (p.life / p.maxLife) * 2.5);
      if (p.kind === 'confetti') mat.rotation += dt * 6;
      if (p.kind === 'heart' || p.kind === 'zzz') mat.rotation = Math.sin(time * 3 + p.seed) * 0.25;
    }
  });

  return <primitive object={group} />;
}
