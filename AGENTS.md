# AGENTS.md — Asteroids

## Project shape

- Pure HTML5 canvas game: `index.html` + `game.js` (one file). **No package.json, no bundler, no dependencies, no test/lint/typecheck tooling.** Verification is manual: open `index.html` in a browser, or serve with `npx serve .` → `http://localhost:3000`. There are no build or test commands to run.
- `game.js` runs top-level on load (`initGame()` + `requestAnimationFrame(loop)` at the bottom) and expects `#canvas` from `index.html`. Don't add module imports/bundler steps without a reason — the design is deliberately zero-dependency ES6.

## Gotchas

- **Canvas size lives in two places**: constants `W`=800 / `H`=600 in `game.js` and the `width`/`height` attributes in `index.html`. Changing one without the other breaks wrapping/collision.
- All positions move through `wrap(v, max)` — the world is toroidal (entities leaving one edge reappear on the opposite edge). Any new entity must wrap in its `update()` or collisions will fail at edges.
- `dt` is capped at 0.05s in `loop()`; tune movement via constants (speeds in px/s, acceleration in px/s²), not per-frame deltas.
- Bullet origin uses ship nose offset (`NOSE = 21` in `Ship.tryShoot`) in addition to the bullet's own movement — keep consistent if touching firing.
- Keyboard input uses `e.code` and reads gamestate states `playing | dead | gameover`. Space and arrow keys get `e.preventDefault()`; don't bind new game keys without considering page scrolling.

## Conventions

- Repo/UI/comments are in **Spanish** (HUD strings, overlay, code comments). Keep author prose, comments, and game text in Spanish; identifiers are English.
- Single-file style is intentional: section banners (`// ── Sección ──...`), `'use strict'` at top, classes for entities, plain functions for orchestration. Keep edits inside this structure; don't split files.
