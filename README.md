# Skeleton Siege — 3D Tower Defense Demo

A browser-based 3D tower defense game built with **Three.js + TypeScript + Vite**, using the
Kenney Tower Defense Kit (environment/towers) and KayKit Skeletons (animated enemies). Both asset
packs are CC0.

## Run

```bash
npm install
npm run dev      # development server
npm run build    # production build (dist/)
npm run preview  # serve the production build
```

## Controls

| Input | Action |
|---|---|
| Left click | Select build pad / tower, place tower |
| Right or middle drag | Pan camera |
| WASD / arrow keys | Pan camera |
| Mouse wheel | Zoom |
| Esc | Cancel build mode / deselect / pause |

## Features

- 5 campaign levels (grass + snow themes), sequential unlock, replayable
- 3 difficulty modes (Easy / Normal / Hard) with distinct economy & enemy scaling
- 4 tower types (Archer, Cannon AoE, Frost slow, Arcane anti-armor), 3 upgrade levels each,
  sell & target priority (First / Last / Strongest)
- 5 enemy roles: Basic, Runner, Armored, Captain (speed aura elite), Boss (Levels 3/4/5)
- Wave preview, manual wave start with early-start coin bonus, 1×/2× game speed
- Endless Mode (unlocked after Level 5) with per-map best-wave tracking
- Contextual tutorial on Level 1 (skippable, remembered)
- Campaign completion screen with lifetime stats
- Versioned localStorage save (progress, best results, settings)

## Architecture

```
src/
  app/        Game orchestrator, loop, per-level state
  assets/     GLTF cache + animation clip registry
  camera/     fixed-angle pan/zoom rig
  config/     all balance data (difficulty, towers, enemies, levels, endless)
  entities/   Enemy, Tower
  systems/    Wave, Enemy, Tower, Projectile (pooled), Placement, Effects, Save
  levels/     declarative level defs → tile/pad/path builder
  ui/         HTML overlay UI (menu, HUD, panels, overlays, tutorial)
```

Levels are declarative: paths and rivers are corner-waypoint lists; the builder derives road
tiles (straight/corner/T/bridge/spawn/end) automatically with measured Kenney tile orientations.

## Credits

- [Kenney Tower Defense Kit](https://kenney.nl) — CC0
- [KayKit Skeletons](https://kaylousberg.com) — CC0
