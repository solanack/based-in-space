# BASED IN SPACE

**Ten sectors. One interceptor. No brakes.**

A high-intensity 3D space combat flight game built with Three.js. Pilot a customizable interceptor through ten escalating sectors, weaving through hazards, engaging enemy formations, and facing unique boss encounters. Features chase and cockpit cameras, adaptive quality, hit-stop feedback, and a polished UI.

## Live Preview

Play the current build: [https://based-in-space-preview.vercel.app/](https://based-in-space-preview.vercel.app/)

## Features

- **3D flight combat** — Smooth interceptor handling with banking, boosts, and precise aiming
- **Ten sectors** — Progressively challenging levels with unique enemy compositions and environments
- **Enemy & boss roster** — Dozens of ship types (fighters, carriers, drones, heavies) plus dedicated boss encounters
- **Visual systems** — GLTF models, material dressing, VFX, post-processing, and adaptive quality scaling
- **UI & progression** — Level select, hangar, settings (camera, controls, audio), and local progress tracking
- **Input** — Keyboard, gamepad, and optional gyro support
- **Audio** — Dynamic soundscape with hit feedback and event-driven cues

## Tech Stack

- **Rendering**: Three.js (bundled as `vendor/three.module.js`) + custom GLTFLoader
- **Architecture**: Vanilla ES modules (no build step required for local play)
- **Assets**: Authored `.glb` models under `assets/models/`
- **Persistence**: Local storage for settings and level progress
- **Deployment**: Static hosting (Vercel-compatible)

## Getting Started

No build step is required. Serve the directory with any static server:

```bash
# Python
python3 -m http.server 8080

# Or Node
npx serve .
```

Open `http://localhost:8080`.

### Debug / QA modes

Append query parameters:
- `?debug` — Extra diagnostics and metrics
- `?qa` — Unlocks all levels for testing

## License

All rights reserved. Source extracted from the live preview for archival and continued development.
