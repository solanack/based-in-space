# Moonfall engineering checkpoint — 2026-10-17

## Authority and identity
Implementation dispatched by user: “Absorb and execute the handoff prompt”, followed by “fix it”. Dedicated feature branch only; no merge or production deployment. Primary solanack/based-in-space main verified at 5405a87196ce1387c43c4179e8d42fffebd5a4e3. No open PRs when checked. Donor solanack/Space-Is-Based branch upgrade/phase36-threejs-razor verified at 55ec601d9c346a0ac288a338d9692a9a5b58cda0. Donor untouched.

## Access recovery
Workspace initially empty. Shell HTTPS fails immediately: cannot connect to configured proxy:8080. Earlier additional-network request stalled and was interrupted by user. GitHub connector succeeds. Retrieved all13 baseline blobs through connector pinned to main SHA; local baseline-export commit is a snapshot, not a claim of full cloned history. Publishing will parent changes to the real remote baseline via GitHub Git API. No network bypass or credential inspection.

## Baseline defect
README advertises complete ten-sector game. Committed src/main.js imports core/loop.js, core/save.js, ui/ui.js, input/input.js, audio/audio.js and combat/hitstop.js that do not exist. Renderer, weapons, enemy runtime and level01 are placeholders. Vendor library and advertised assets absent. No package scripts, tests, workflows or AGENTS.md in primary tree. Baseline cannot boot. Old forward-distance world is unsuitable for requested free flight.

## Decisions
One static ESM application, one WebGL2 renderer, one60Hz simulation, no runtime CDN. Retain JavaScript rather than introduce network-dependent Vite/TypeScript tooling in this inaccessible shell. Vendored official Three.js r180 build (same as donor) under MIT license. Arcade continuous sphere collision, no physics engine overhead. Accepted owned RAZOR source reused; no generation credits. Procedural original lunar kit and synth sound. Two focused workers: simulation/tests and controls/UI; lead owns graphics/integration/QA.

## Current work
Source recovered; feature branch created. Simulation, tests, mobile input/HUD, terrain chunks, model adaptation, base kit and audio underway. See final-evidence.md for measured status after integration. Physical Android bridge unavailable; real device/tactile/thermal gates remain pending. No premium/mobile-ready claim without evidence.

## Browser checkpoint
Elevated local socket execution resolved the sandbox blocker. Chromium integration and resource checks now pass in focused passes;19unit tests and three normal-input siege bot completions pass. Evidence and residual gaps are in final-evidence.md. Fixed missing favicon requests, too-small hero camera framing, shared material disposal, stale debrief state, two-thumb boost, visible missile warnings and reflection rebuild on graphics restore. User explicitly authorized production deployment with “Finish and deploy”; use existing Vercel project based-in-space-preview (prj_WH3YnGckzQI2DURswCyrszZZ6Fss), team_zgw1By8eYZVT4GmLIlMyDRrl. Prior production rollback candidate dpl_9YaqPgeJR7NeNmhMCtCRgSiLyi1e. No merge authorized or needed.

## Deployed
Production READY at https://based-in-space-preview.vercel.app/, deployment dpl_B1FGnDEcrjbnfChf6RpzvsYMJwX8, source c33a752735cebd36ae20dc928d51d76508288803. Public Chrome smoke passes with zero page/console/resource errors. GPU is SwiftShader software renderer; raw timing350ms includes startup and is not a physical-device performance pass. Evidence/production-smoke.json, deployment.json and final-evidence.md record exact limits. Further hardware/performance and premium content work remains. PR1 stays draft; main/donor untouched.

## Owner control/HUD correction
Owner reported reversed controls, unnecessary altitude buttons, text clutter and distant camera. Root cause: world+X projects screen-left from the north-facing camera. Added camera-basis input mapping (simulation remains world-space). Stick vertical now supplies ascent/descent as well as forward/reverse movement; removed ALT buttons. Default close rig is42up/62behind vs82/115,50°FOV; tactical/chase remain available. Removed branding, per-module/target text and weapon paragraphs from flight view; use bars, contact shapes and action icons. Fixed pause anchoring after removing brand flex item.
23unit tests pass, including four camera-heading screen projection regressions. Focused actual touch checks pass for left/right/climb/descent and simultaneous steer+climb+fire+boost. Three phone layouts clear; hero spans114–136CSSpx (over2× prior). Report artifacts/controls-review.json. Redeploy this correction under prior production authorization.

Correction deployed and public smoke PASS: dpl_CU7Ds8e7hM33kNx6RyP7JGYkqGri, application d200bf8eaeb666a3fc616401d1b1b8839d154391. Same public URL. Current screenshot/report under artifacts/evidence/live-production.jpg and production-smoke.json. Pause overlap corrected and verified at public URL.

## Flight control redesign
Owner rejected the corrected screen-steering feel. Default now uses explicit arcade aircraft intents: constant forward cruise; left/right yaw; up/down pitch; automatic leveling on release; close heading-following camera. No direction/altitude coupling and no stale pointer aim rotating the hero. Floating180×160thumb zone initializes at touch origin with zero command. Brake increases turn rate for a quick reversal, modest7degree forward cannon correction helps touch aiming, and terrain/ceiling leveling reduces accidental scrape. Optional hover style remains under pause settings. Hero Euler orderYXZ aligns pitch with yawed nose.
Motion regression found climb-to-dive lag; response increased to12/s.31unit tests now pass including reversal within0.4s. Actual CDP gestures verify neutral initial contact, nose turns, climb and dive, simultaneous turn/climb/fire/boost and pause cleanup in three phone sizes; zero errors/resources. Read artifacts/flight-feel.json. Normal-input arcade playtest: two siege completions and one loss (artifacts/arcade-playtest.json). The evidence does not establish owner tactile approval or hardware FPS.

Aircraft controls production READY: dpl_EApEfLN4LcTDy2NvYXr98cjzscFy, application f7719759ee9979c83e62416a8f5549c34af97187. Public Chrome verifies new default and nose turn; zero errors. Same URL. Owner subjective acceptance still pending; hover remains selectable.
