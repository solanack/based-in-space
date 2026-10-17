# Moonfall evidence — 2026-10-17

## Verified

Primary baseline5405a87196ce1387c43c4179e8d42fffebd5a4e3; accepted donor55ec601d9c346a0ac288a338d9692a9a5b58cda0. Source, license and transforms: [provenance](../docs/asset-provenance.md). Baseline could not boot because imports and runtime implementations were missing. One coherent application now replaces that scaffold.

- `npm run check`: syntax and every static import pass.
- `npm test`:19 deterministic tests pass; movement, altitude, swept cover/collision, homing limits, warnings/decoys, firing sockets, heat, AI turn/LOS, siege, failure and save migration.
- `npm run test:bot`: three normal-input simulations complete the siege and save rewards. No health, position, time or enemy mutation. Completion81.20–81.43simulation seconds,21kills,20–88hull remaining,693–700credits; base modules retain measurable siege damage. [Full results](bot-playtest.json).
- Production static build:15 runtime files, approximately824KB uncompressed; no install/runtime CDN or paid asset/API dependency. `dist/build-manifest.json` records file hashes and bytes.
- Real Chromium with mobile emulation, system ffmpeg and one WebGL2 renderer: simultaneous steer/fire/boost, two-pointer FIRE-drag boost, release cleanup, hold-lock-release missile, user-gesture audio unlock, mute, pause/resume, fail/retry, debrief purchase/persistence, portrait auto-pause and landscape return pass.
-640×360,844×390,932×430 and1440×900 control bounds/overlap/minimum48px checks pass. Fire target64–84px on compact viewports. Native-resolution screenshots were inspected; review copies are linked below.
- Forced WebGL context loss pauses, restores resources/reflections and resumes; offline after initial load stays playable. Both checks pass with no console/page/resource errors.

The browser checks ran in focused passes: first33.1seconds unpaused keyboard flight; then control/viewport/debrief checks; finally context recovery after repairing the test fixture. The last test issue was requesting the loss extension after the context had already been lost; retaining the extension reference fixed the fixture. An earlier menu state bug was fixed by updating HUD data before rendering the debrief. These are observed checks, not a claim that a human completed the mission on a phone. [Raw browser reports](evidence/browser-reports.json).

## Captures and motion

- [Compact phone640×360](evidence/640x360-active-play.jpg)
- [Phone844×390, active steering and fire](evidence/844x390-active-play.jpg)
- [Wide phone932×430](evidence/932x430-active-play.jpg)
- [Desktop1440×900](evidence/1440x900-active-play.jpg)
- [Siege and eight actors](evidence/844x390-siege.jpg)
- [After context restore](evidence/context-restored.jpg)
- [34second gameplay clip](evidence/gameplay.webm)

Review JPGs are encoded from actual browser screenshots; original PNG/canvas captures remain cached locally under artifacts/qa-final. Canvas captures were separately checked for pixel variation. No generated mockups. Video is a compressed excerpt of the actual input-driven browser recording.

## Rendering and feel measurements

During captured patrol/siege:61–90draw calls,48,188–56,182visible triangles,83–97geometries,4textures; one512px shadow-casting directional light, no post passes,25terrain chunks and180instanced rocks. These fit the workflow's mobile resource budget. RAZOR stays the original glossy black/red/white batched model at scale3.2. Camera was tightened after the first screenshot showed it too small. Shared enemy material cleanup was corrected to avoid invalidating live instances.

Boost: old tunnel cruise72/boost122; new cruise115/boost330units/s (2.70× old boost), exponential response5/s, boost drain28/s/refill19/s. Browser flight covered over1.5km and crossed a floating-origin boundary with continuous movement. Frame samples in the first reports were capped at the simulation's100ms backlog limit; this was corrected so future `frameMs` reports use raw rAF intervals. Submission CPU time is not GPU time. Cloud software-rendered capture timing does not establish Android FPS; no30/60FPS claim.

## Visual assessment and remaining gates

This is a playable development deployment, not an AAA/premium acceptance claim. RAZOR and functional base/enemy forms are authored and recognizable. The procedural world is still sparse, terrain surface richness and explosion/dust layering need refinement, and UI contact labels can crowd when many actors share a bearing. The premium scorecard threshold is NOT established; no invented passing score.

Physical Android/Seeker10minute tactile/thermal/audio/FPS, iOS Safari, hardware gamepad,200–300% system text scaling, safe-area device cutouts and slow-network cold starts are NOT TESTED. No device is paired. Browser emulation does not substitute for these.

## Partial scope

One representative procedural region and three hostile roles; no capital boss/large fleet. Whole-ship damage rather than localized engine/hardpoint destruction. Persistent rewards/upgrades and retry, without mid-sortie recovery. No service worker; no stale application cache, but no cold offline loading guarantee. No full long-form open-world campaign claim. Additional modules, map composition and premium art/feel are future content.

## Workflow

Skills used: cloud-environment runtime/networking; owner Three.js game-director with gameplay, graphics, UI, debug and QA specialists and scoped references; Vercel deployment guidance. Two focused workers produced simulation/tests and controls/UI. Accepted owner mesh and original procedural geometry/audio used; no generation spend. Draft PR1 preserves review; deployment is authorized by the user's later “Finish and deploy”. Main and donor are not modified by deployment.
