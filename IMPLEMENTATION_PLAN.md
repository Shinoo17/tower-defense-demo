# Implementation Plan

## Stack
Vite + TypeScript + Three.js (no framework). HTML/CSS overlay UI. localStorage persistence.

## Architecture
```
src/
  main.ts                 entry, boot + loading screen
  app/Game.ts             orchestrator: owns scene, systems, level lifecycle
  app/GameLoop.ts         rAF loop, delta time, speed multiplier, pause
  app/GameState.ts        per-level runtime state (coins, lives, wave, counters)
  assets/AssetManager.ts  GLTF cache, clone helpers, animation clip registry
  assets/manifest.ts      asset path constants
  camera/CameraRig.ts     ortho-style perspective at fixed pitch; pan/zoom, bounds
  config/difficulty.ts    Easy/Normal/Hard multipliers
  config/towers.ts        4 towers × 3 levels stats + assembly recipes
  config/enemies.ts       5 enemy roles, model/anim/stat mapping
  config/levels.ts        5 level definitions (grid, paths, pads, waves, decor)
  config/endless.ts       endless scaling params
  entities/Enemy.ts       skinned instance, path follower, health bar, effects
  entities/Tower.ts       assembled model, weapon aim, level visuals
  entities/Projectile.ts  pooled projectile w/ arc or straight flight
  systems/WaveSystem.ts   wave scheduling, spawning, endless generator
  systems/CombatSystem.ts targeting, firing, damage, slow/buff effects
  systems/PlacementSystem.ts raycast pads, ghost preview, build/sell/upgrade
  systems/SaveSystem.ts   versioned localStorage save
  systems/EffectsSystem.ts pooled particles (impacts, deaths, frost)
  levels/LevelBuilder.ts  builds tile grid, paths, pads, decor from definition
  ui/ (UIManager, MainMenu, LevelSelect, HUD, TowerPanels, WavePanel,
      PauseMenu, ResultScreens, CompletionScreen, Tutorial)
  utils/ (math, dispose, dom)
```

## Level construction
- Each level = declarative definition: grid size, tile placements (type + rotation),
  waypoint paths in tile coords, build-pad tile coords, decorations, camera bounds, wave list.
- `LevelBuilder` instantiates cached GLBs, merges nothing (tile counts are small, < 400 per map),
  one group per level → easy disposal on level exit.
- Waypoints converted to world-space polyline; enemies interpolate with distance-based
  progression + corner smoothing (lerp of direction).

## Enemy animation strategy
- Load `Rig_Medium_General.glb` + `Rig_Medium_MovementBasic.glb` once, keep their `AnimationClip[]`.
- Character GLB cloned via `SkeletonUtils.clone`; per-enemy `AnimationMixer` on the clone.
- Clip lookup by normalized name with fallback chain, e.g. death: `Death_A → Death_B → (fade-out only)`.
  Missing optional clips never throw.

## Save data (localStorage key `td-save`, versioned)
```ts
{ version: 1, difficulty, highestUnlockedLevel, completed: { [level]: { [diff]: { bestLives, bestScore } } },
  campaignDone: { [diff]: boolean }, endlessUnlocked, endlessBest: { [mapId]: { [diff]: wave } },
  tutorialSkipped, settings: { shadows, quality }, stats: { kills, coins, towers, playMs } }
```
JSON parse wrapped in try/catch; invalid → fresh save.

## Known asset limitations
- No melee-attack animation clip in the provided KayKit pack → enemies never "attack" the base
  visually; they reach it and despawn with a flash (acceptable for TD).
- Boss uses scaled/tinted Warrior (no dedicated boss model in pack).
- No audio assets provided → no sound (settings structure reserves the slot).

## Phases
1. ✅ Audit (this doc + ASSET_AUDIT.md)
2. Scaffold Vite project, copy assets to `public/assets/`
3. Vertical slice: menu → Level 1 playable end-to-end
4. All towers/enemies/levels 2-5, upgrades, priorities, completion screen, endless
5. Polish, balance, production build verification
