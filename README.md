# PetPal 3D 🐾

Ein Tamagotchi-artiges 3D-Haustier-Spiel: Tier auswählen, benennen, füttern, spielen, waschen, schlafen legen, aufs Klo bringen – und dabei zusehen, wie es mit niedlichen Animationen auf alles reagiert.

**Stack:** React 18 · TypeScript · Vite · three.js über `@react-three/fiber` + `drei` · Zustand (`persist`) · Tailwind CSS · `vite-plugin-pwa` · Vitest

## Loslegen

```bash
npm install
npm run dev        # Entwicklungsserver
npm test           # Spiellogik- und Animations-Tests (Vitest)
npm run build      # Typecheck + Produktions-Build inkl. Service Worker
npm run preview    # Build lokal ansehen (PWA installierbar)
```

Im Dev-Modus ist der Store in der Browser-Konsole als `petpal` verfügbar, z. B.
`petpal.setState({ coins: 500 })` oder
`const s = petpal.getState(); petpal.setState({ pet: { ...s.pet, stats: { ...s.pet.stats, bladder: 99 } } })`.

## Spielfeatures

- **5 Tiere** (Katze, Hund, Hase, Drache, Pinguin) mit eigenen Raten, Lieblingsessen und -spielzeug – alles in `src/game/pets.config.ts`.
- **6 Bedürfnisse** (Hunger, Energie, Laune, Hygiene, Blase, Gesundheit). Die Zeit läuft auch bei geschlossener App weiter – gedeckelt auf 8 Stunden, mit halber Rate und Untergrenzen, damit das Tier nach dem Urlaub nicht sofort krank ist.
- **Animationen:** Idle (Atmen, Blinzeln, Umschauen, zufällige Variationen), Essen (Futter erscheint im Napf, wird kleiner), Klogang (Zappeln + Gedankenblase → Katzenklo → Hocken → Erleichterung; bei zu langem Warten ein Häufchen, das man antippen und wegputzen muss), Schlafen (Zzz, Raum wird dunkel), Spielen (Ball, Laserpointer, Federwedel), Streicheln (über das Tier wischen → Herzen), Waschen (Seifenblasen, Schütteln mit Tropfen), traurig/krank/hungrig (hängende Ohren, langsamer Gang, Emote-Blasen). Alle Übergänge werden per Crossfade überblendet.
- **Arten-Eigenheiten:** Hund wedelt je nach Laune, Drache speit Funken, Pinguin watschelt und mag den Kälte-Raum, Hase hoppelt.
- **Szene:** Wohnzimmer mit Futterecke, Katzenklo, Körbchen, Spielzeugkorb; Tag/Nacht nach echter Uhrzeit (Fenster, Licht); Toon-Shading, weiche Schatten. Kamera per Wischen drehbar, Pinch-Zoom, Doppeltipp zentriert auf das Tier.
- **Fortschritt:** Baby → Kind (24 h) → Erwachsen (72 h) mit wachsendem Modell und neuen Idle-Animationen (Purzeln, Hüpfen, Pirouette). Münzen für gute Pflege, Shop (Futter, Spielzeug, Deko, Accessoires), Tagebuch mit Alter, Lieblingsaktivität und Pflege-Serie.
- **Sound:** Alle Geräusche (Schmatzen, Schnarchen, Seifenblasen, Münzen, Fanfare …) werden per WebAudio erzeugt – keine Audiodateien, offline-fähig, jedes Tier mit eigener Stimmlage (`voice` in der Config). In den Einstellungen abschaltbar.
- **PWA:** installierbar, offline-fähig; optionale Benachrichtigungen, wenn das Tier im Hintergrund dringend etwas braucht.

## Projektstruktur

```
src/
  game/        Reine Spiellogik (ohne React/three): Typen, pets.config.ts, items.ts,
               stats.ts (Verfall), tick.ts (Simulation inkl. Offline), actions.ts,
               progression.ts (Alter, Serie), mood.ts, daynight.ts, balance.ts
  store/       Zustand-Stores: gameStore (persistiert), uiStore (Panels, Toasts, Emotes)
  scene/       3D-Szene: Experience (Canvas), Room, Lighting (Tag/Nacht), CameraRig,
               Props (Futter, Ball, Laser, Häufchen), ParticleSystem, toon.ts, layout.ts
  pets/        <Pet />, PetBrain (Verhalten + Animations-Blending), clips.ts (Clips & Posen),
               behaviors.ts (Abläufe: Essen, Klo, …), PlaceholderPet, GltfPet, Accessory
  ui/          HUD, Aktionsleiste, Menüs, Shop, Tagebuch, Einstellungen, Onboarding
  i18n/        Übersetzungen (de.ts) + t()-Funktion
  audio/       Prozedurale Soundeffekte (sfx.ts)
  assets/      Sounds, Texturen
public/models/ GLB-Modelle
```

### Architektur in Kürze

1. **Spiellogik** ist rein funktional (`(state, now) → { state, events }`) und vollständig getestet.
2. Der **Store** wendet Aktionen an und sendet `GameEvent`s über einen kleinen Event-Bus.
3. **`PetBrain`** übersetzt Events in Verhaltens-Abläufe (Schritte: hinlaufen, Clip abspielen, Props steuern) und blendet Animations-Clips gewichtet über (Crossfade ≈ 0,3 s). Er ist unabhängig von React und three.js.
4. **`<Pet />`** wendet Position und Pose jedes Frame auf das Modell an – Platzhalter aus Primitiven oder ein GLB-Modell mit echten Animations-Clips.

## Eigene Modelle

Siehe [`public/models/README.md`](public/models/README.md). Kurz: GLB nach `public/models/` legen und in `pets.config.ts` beim Tier ein `model` mit URL, Skalierung und Clip-Zuordnung eintragen. Fehlt die Datei, wird automatisch das Platzhalter-Modell verwendet.

## Neues Tier hinzufügen

1. `SpeciesId` in `src/game/types.ts` erweitern.
2. Eintrag in `PETS` in `src/game/pets.config.ts` (Raten, Favoriten, Aussehen, Fortbewegung).
3. Namen/Beschreibung in `src/i18n/de.ts` ergänzen (`species.<id>`, `species.<id>Desc`).

## Weitere Sprache

`src/i18n/de.ts` kopieren (z. B. `en.ts`), übersetzen und in `src/i18n/index.ts` bei `locales` registrieren. Die Sprache wird aus `navigator.language` gewählt.

## Performance

Geteilte Toon-Materialien, gepoolte Partikel (ein Sprite-Pool), Animation ohne React-Re-Renders (mutable Refs in `useFrame`), 1024er-Shadowmap und adaptive Pixeldichte über `PerformanceMonitor` – Ziel 60 fps auf Mittelklasse-Handys.
