# BASED IN SPACE — MOONFALL

Work-in-progress lunar defense slice: the owned glossy black/red/white RAZOR, free 3D flight, twin cannons, lock-on missiles, three hostile roles, and a destructible outpost siege. This feature branch replaces an incomplete archived ten-sector scaffold. It is not yet a verified mobile release.

## Run locally

Node24 and Python3 required for checks/build. No npm install or remote runtime dependencies:

```sh
npm test
npm run check
npm run build
npm run preview
```

Open http://localhost:5188 in landscape. `npm run dev` serves source directly. The build is ordinary static files in `dist/`; deploy tooling is intentionally absent. The original README preview address represents the old deployment and is not evidence of this feature's release.

## Controls

- Touch: left stick steers; right aim region; FIRE, BOOST, BRAKE, ALT±, FLARE; hold MISSILE to lock, release to launch. Slide upward while holding FIRE to boost with two thumbs.
- Keyboard: WASD/arrows steer, Q/E altitude, Space fire, Shift boost, Control brake, M hold/release missile, X countermeasure, Escape pause.
- Mouse: aim at world position and left button fire. Gamepad: left stick movement, right stick aim, triggers weapons, bumpers altitude, A boost, B brake, X flare.
- Pause opens settings for handedness, layout, size, sensitivity, reduced motion/flashes, quality and audio. Portrait intentionally pauses and shows a rotate notice.

Mission: patrol and intercept; three bomber/escort waves pressure the reactor, comms, hangar and fuel installation independently. Surviving75seconds of siege with no bombers remaining and a surviving base reaches debrief. Credits buy hull/shield/engine upgrades. Profile saves migrate older data and tolerate unavailable local storage. Restart starts a fresh sortie.

One WebGL2 context, fixed60Hz simulation with bounded backlog, interpolated rendering,25 streamed terrain chunks, relative swept-sphere collision, bounded missiles/VFX, floating visual origin, and adaptive DPR. Audio synthesizes locally after deployment click. Three.js0.180.0 is vendored under MIT; owner assets remain all rights reserved. See [asset provenance](docs/asset-provenance.md).

## Verification and limits

`npm test` runs19 deterministic simulation checks. `npm run test:bot` completes three normal-input siege playtests. Browser QA is provided as `npm run qa` and uses installed Python Playwright, system Chromium and ffmpeg; the runner must allow localhost sockets. In this managed environment Chromium needs elevated local socket permission. Current measured status, incomplete gates and blockers are in [evidence](artifacts/final-evidence.md) and [checkpoint](artifacts/game-progress.md).

Chrome input/lifecycle checks, target-viewport captures and motion evidence are recorded. Real Android tactile/performance acceptance remains unverified. No production merge/deployment. No service worker: no stale application cache, but cold offline loading is not guaranteed. Progress/upgrades persist; mid-sortie recovery checkpoints and localized ship-component destruction remain follow-on work. The region is procedural, not a claim of a finished expansive open world.

Fictional entertainment. No Elon Musk/SpaceX affiliation or endorsement.
