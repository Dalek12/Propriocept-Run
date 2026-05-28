# Propriocept Run Visual Prototype

This is a lean web prototype for an adjustable running-form visualization tool. It proves the first product step: a runner or coach can watch a biomechanically meaningful reference figure, switch anatomy overlays, adjust running parameters, and compare an efficient pattern against a manually tuned current pattern.

## What Is Implemented

- Full-screen React + Three.js runner stage.
- Procedural articulated runner with parameter-driven running motion.
- Teaching presets for efficient form, overstride, excessive bounce, low cadence, upright trunk, pelvis drop, and narrow crossover.
- Overlay modes for body, skeleton, muscles, force signals, and comparison.
- Adjustable controls for pace, cadence, stride length, vertical bounce, trunk lean, arm swing, pelvis rotation, shoulder-pelvis counter-rotation, pelvis drop, step width, and foot strike.
- Rule-based biomechanics signal layer for gait phase, landing force, knee load, obliques/lats/glutes/hip rotators/spinal stabilizers/calves, overstride, pelvis drop, and crossover alerts.
- Manual comparison mode with reference runner on the left and current runner on the right.
- Input-provider stubs for later camera pose and wearable sensor integration.
- CMU Subject 9 Trial 1 running mocap imported as a normalized browser motion clip.

## Stack

- TypeScript
- React
- Three.js
- React Three Fiber
- Vite
- Lucide icons

## Run Locally

```bash
npm install
npm run dev
```

The default development URL is:

```text
http://127.0.0.1:5173/
```

Build production output:

```bash
npm run build
```

Import the current CMU running clip:

```bash
npm run import:cmu
```

The importer reads:

- `public/mocap/cmu/09.asf`
- `public/mocap/cmu/09_01.amc`

and writes:

- `public/mocap/cmu/09_01_run.motion.json`

## Motion Data

The first real motion source is CMU Graphics Lab Motion Capture Database Subject 9, Trial 1. The source ASF/AMC files are kept in `public/mocap/cmu/`, and the app loads the generated JSON motion clip at runtime. The user can switch between the imported CMU mocap path and the original procedural runner.

## Prototype Resource Plan

Lean v1 target: `$8k-$20k`.

| Resource | Choice | Estimated Cost |
|---|---|---:|
| Web/3D developer | React + Three.js prototype | $5k-$10k |
| 3D artist/technical animator | rig cleanup, skins, anatomy overlays, mocap retargeting | $2k-$6k |
| Biomechanics consultant | signal sanity check and terminology review | $750-$2.5k |
| UI/UX polish | control surface, demo flow, visual hierarchy | $1k-$3k |
| 3D/mocap assets | Mixamo free or paid mocap/character assets | $0-$1k |
| Software | Blender, Three.js, OpenSim, Mixamo | $0 base cost |
| Demo hardware | existing laptop; optional display/webcam | $0-$1.2k |
| Contingency | asset replacement, animation cleanup, testing | $1k-$3k |

## Later Phases

Camera personalization should come after the visual teaching prototype is compelling.

Recommended sequence:

1. Clean the CMU mocap loop and decide whether to keep JSON joint playback or move to a glTF humanoid rig.
2. Validate the rule-based biomechanics signals with a biomechanics consultant.
3. Add a manual coach mode for saving reference/current presets.
4. Add MediaPipe Pose Landmarker as a `CameraPoseProvider`.
5. Add optional IMU/footpod input as a `WearableSensorProvider`.
6. Use OpenSim or AnyBody-generated simulation data to train a real-time surrogate model for joint loading, muscle activation, and ground-reaction force estimates.

## Important Limits

This prototype is a visualization and teaching demo. It does not diagnose injuries, provide medical advice, or claim clinically validated biomechanical accuracy.
