# Asset Audit

## Repository state
- No existing application. Fresh Vite + TypeScript + Three.js project will be created at repo root.
- Node v22.18.0 / npm 11.18.0 available.

## Pack 1: kenney_tower-defense-kit (v2.1)
- **License:** CC0 (`kenney_tower-defense-kit/License.txt`)
- **Formats:** GLB (preferred, `Models/GLB format/`, 161 files), FBX, OBJ. GLB used exclusively.
- **Tile size:** 1 × 1 units, 0.2 units tall, origin at tile center, road surface at y=0.2.
- All models are static (no skins, no animations). Vertex-colored / simple materials.

### Terrain tiles (grass + `snow-` prefixed variants)
`tile.glb`, `tile-straight.glb`, `tile-corner-round.glb`, `tile-corner-square.glb`,
`tile-split.glb`, `tile-crossing.glb`, `tile-end.glb`, `tile-end-round.glb`,
`tile-spawn.glb`, `tile-spawn-round.glb`, `tile-spawn-end.glb`, `tile-spawn-end-round.glb`,
`tile-river-straight.glb`, `tile-river-corner.glb`, `tile-river-bridge.glb`,
`tile-tree.glb`, `tile-tree-double.glb`, `tile-tree-quad.glb`, `tile-rock.glb`,
`tile-crystal.glb`, `tile-dirt.glb`, `tile-hill.glb`, `tile-bump.glb`, plus
wide/transition/slope variants. Snow set mirrors all of the above (`snow-tile-*`).

### Decoration
`detail-tree.glb`, `detail-tree-large.glb`, `detail-rocks.glb`, `detail-rocks-large.glb`,
`detail-crystal.glb`, `detail-crystal-large.glb`, `detail-dirt.glb` + `snow-detail-*` variants,
`wood-structure*.glb`, `snow-wood-structure*.glb`.

### Tower construction (modular, stackable)
- Round set: `tower-round-base.glb`, `tower-round-bottom-a/b/c.glb`, `tower-round-middle-a/b/c.glb`,
  `tower-round-top-a/b/c.glb`, `tower-round-roof-a/b/c.glb`, `tower-round-crystals.glb`,
  `tower-round-build-a..f.glb`
- Square set: `tower-square-bottom-a/b/c.glb`, `tower-square-middle-a/b/c.glb`,
  `tower-square-top-a/b/c.glb`, `tower-square-roof-a/b/c.glb`, `tower-square-build-a..f.glb`
- Footprint 1 × 1, piece heights measured at runtime via Box3 for stacking.

### Weapons & projectiles
`weapon-ballista.glb` (contains `arrow` mesh), `weapon-cannon.glb` (contains `barrel`),
`weapon-catapult.glb`, `weapon-turret.glb`,
`weapon-ammo-arrow.glb`, `weapon-ammo-cannonball.glb`, `weapon-ammo-boulder.glb`, `weapon-ammo-bullet.glb`.
Weapon pivot at base center → mounts directly on tower top surface.

### Misc
`spawn-round.glb`, `spawn-square.glb` (entrance/exit markers), `selection-a/b.glb` (selection rings),
`enemy-ufo-*.glb` (unused — skeletons are the enemies).

## Pack 2: KayKit_Skeletons (v1.1)
- **License:** CC0 (`KayKit_Skeletons/License.txt`)
- **Formats:** GLB (preferred, `characters/gltf/`), FBX, OBJ.

### Character models (skinned, shared rig `Rig_Medium`, no embedded animations)
- `Skeleton_Minion.glb` — small basic skeleton
- `Skeleton_Rogue.glb` — hooded, agile look
- `Skeleton_Warrior.glb` — helmet + armor pieces
- `Skeleton_Mage.glb` — hat + staff-caster look
- Height ≈ 1.23 units. Game scale factor ≈ 0.55 relative to 1-unit tiles.

### Animation libraries (separate GLBs, same `Rig_Medium` rig → clips retarget directly)
- `Animations/gltf/Rig_Medium/Rig_Medium_General.glb` (15 clips):
  `Death_A`, `Death_A_Pose`, `Death_B`, `Death_B_Pose`, `Hit_A`, `Hit_B`, `Idle_A`, `Idle_B`,
  `Interact`, `PickUp`, `Spawn_Air`, `Spawn_Ground`, `T-Pose`, `Throw`, `Use_Item`
- `Animations/gltf/Rig_Medium/Rig_Medium_MovementBasic.glb` (11 clips):
  `Jump_*` (5), `Running_A`, `Running_B`, `T-Pose`, `Walking_A`, `Walking_B`, `Walking_C`
- No dedicated melee-attack clip in provided pack → enemies use walk/run/hit/death only (sufficient for TD).

## Role → asset mapping

| Game role | Model | Notes |
|---|---|---|
| Basic Skeleton | `Skeleton_Minion.glb` | walk `Walking_A` |
| Runner Skeleton | `Skeleton_Rogue.glb` | `Running_A`, scale ×0.9 |
| Armored Skeleton | `Skeleton_Warrior.glb` | slow `Walking_B`, armor vs physical |
| Skeleton Captain | `Skeleton_Mage.glb` | speed-buff aura, scale ×1.12 |
| Skeleton Boss | `Skeleton_Warrior.glb` | scale ×1.8, dark tint, `Walking_B` |

| Tower | Assembly |
|---|---|
| Archer | round base + round bottom + round top + `weapon-ballista` |
| Cannon | square bottom + square top + `weapon-cannon` |
| Frost | round bottom + round top + `detail-crystal` cluster, blue tint |
| Arcane | square bottom + square middle + `tower-round-crystals` top, purple tint |

Tower level shown by inserting extra `middle` segments (taller = higher level) + banner/roof change at L3.

## Asset strategy
- Needed GLBs copied (not moved) into `public/assets/` at build-time setup; originals untouched.
- Single `GLTFLoader` cache; static models cloned shallowly, skinned models via `SkeletonUtils.clone`.
- Animation clips loaded once from the two rig GLBs, shared across all skeleton instances.
