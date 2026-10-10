# GLB-Modelle

Hier können echte Tiermodelle (z. B. von [Quaternius](https://quaternius.com), [Kenney](https://kenney.nl) oder selbst in Blender erstellt) als `.glb` abgelegt werden.

## Einbinden

In `src/game/pets.config.ts` beim gewünschten Tier ein `model` ergänzen:

```ts
cat: {
  // ...
  model: {
    url: '/models/cat.glb',
    scale: 0.5,
    // Logische Clips → Clip-Namen in der GLB-Datei
    clips: {
      idle: 'Idle',
      walk: 'Walk',
      run: 'Gallop',
      eat: 'Eating',
      sleep: 'Idle_Sleep',
      jump: 'Jump',
      happy: 'Jump',
      squat: 'Sit',
      sit: 'Sit',
      sad: 'Idle_Sad',
    },
  },
},
```

- **Accessoires** (Hut, Schleife, Krone, Schal) werden an den Knochen `headBone` gehängt. Mit `accessoryOffset` und `accessoryScale` passt du Sitz und Größe an, z. B.
  `headBone: 'Head', accessoryOffset: [0, 0.1, 0], accessoryScale: 2`.
- Das Modell sollte in **+Z** blicken und mit den Füßen auf **y = 0** stehen.
- Nicht zugeordnete Clips fallen auf `idle` zurück.
- Die Übergänge werden mit `crossFade` (0,3 s) geblendet; Position, Drehung und Laufwege steuert weiterhin `PetBrain`.
- Lädt die Datei nicht, wird automatisch das Platzhalter-Modell angezeigt.

Alle logischen Clips: `idle, walk, run, eat, fidget, squat, sleep, jump, pounce, nuzzle, scrub, shake, sad, sit, happy, refuse, spin, tumble, hop` (siehe `src/pets/clips.ts`).
