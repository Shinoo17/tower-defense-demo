# Skeleton Siege Design System

## Overview

The interface is a preserve-first evolution of the existing low-poly game. It uses a forest-night neutral foundation, warm coin-gold as the single action accent, and the existing tower colors only as semantic tower identities. Menus are cinematic and spacious; gameplay UI is compact and practical.

## Color

- Canvas sky: `#87b5d6`
- Deep forest ink: `#101914`
- Raised forest surface: `#18231d`
- Primary text: `#f4f6ed`
- Secondary text: `#b8c2b5`
- Action accent / coin: `#f2b84b`
- Success: `#80b85a`
- Danger: `#d96959`
- Hairline: white at 12-16% opacity

The gold accent denotes primary actions, current selection, and currency. Tower-specific green, orange, blue, and violet remain local identifiers and never become page-wide decoration.

## Typography

Use a system sans stack for labels and controls. Display titles use the same family at heavier weights with restrained tracking. Gameplay headings and titles use `clamp()` only where responsive scaling prevents overflow. Numeric HUD values use tabular numerals.

## Shape and Material

- Panels: 14-16px radius
- Buttons: 10-12px radius, never excessively pill-shaped
- Touch controls: minimum 44px in both dimensions
- Surfaces: opaque or nearly opaque forest fills with a single edge highlight
- Shadows: short, tinted, and reserved for floating gameplay layers
- Glass blur: only where a panel must preserve battlefield context, with a solid fallback

## Layout

- Desktop menu: left-weighted panel with battlefield visible around it
- Mobile portrait menu: title in the upper region and actions in the thumb-friendly lower half
- Gameplay: safe-area top HUD, tower tray along the bottom, contextual panels clear of the tray
- Mobile portrait tower tray: collapsible bottom sheet with horizontal scroll
- Mobile landscape tower tray: compact horizontal rail
- All full-screen surfaces use dynamic viewport units and safe-area padding

## Components

Buttons support default, hover, focus-visible, active, disabled, and selected states. Tower cards show a real Kenney-model thumbnail, name, role, cost, affordability, and selection. Difficulty cards expose all gameplay multipliers in readable rows. Panels close via explicit controls and outside-scene taps where appropriate.

## Motion

UI transitions use 160-240ms ease-out curves. The menu camera drifts slowly and background skeletons walk to establish depth. Selection and placement motion communicates state. All automatic motion becomes static when `prefers-reduced-motion: reduce` is active.

## Performance

Renderer pixel ratio is capped by a capability profile. Small or constrained devices use lower shadow maps, fewer particles, and reduced antialiasing cost. Rendering stops while the document is hidden. React is not introduced into the current vanilla TypeScript architecture; the existing DOM overlay remains responsible for UI while Three.js owns the scene.
