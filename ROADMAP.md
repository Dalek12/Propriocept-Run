# Propriocept Run Prototype Roadmap

Updated: May 19, 2026

## Current Prototype Status

The current prototype is a self-contained React + Three.js web app that demonstrates the core product idea:

- A full-screen animated runner.
- Adjustable pace, cadence, stride length, vertical bounce, trunk lean, arm swing, pelvis rotation, shoulder-pelvis counter-rotation, pelvis drop, step width, and foot strike.
- Teaching presets for efficient form, overstride, excessive bounce, low cadence, upright posture, pelvis drop, and narrow crossover.
- Body, skeleton, muscle, force, and comparison overlays.
- Manual side-by-side comparison mode.
- Rule-based biomechanics signals for gait phase, muscle glow, landing force, knee load, overstride, pelvis drop, and crossover alerts.
- Future input-provider stubs for camera pose and wearable sensors.

Important limitation: the current runner is procedural. It is useful for proving the visual teaching concept, but it is not yet driven by real runner motion-capture data.

Update: Phase 2 has started with CMU Subject 9 Trial 1. The official ASF/AMC files are stored in `public/mocap/cmu/`, converted with `npm run import:cmu`, and loaded by the app as `09_01_run.motion.json`.

## What The Original Paper Gives Us

The PDF describes real runner data, but does not include the actual usable dataset.

The paper used:

- 149 kinematic running trials.
- 39 subjects.
- 35 full-body markers.
- 9 Qualisys cameras.
- 300 Hz capture.
- Treadmill running trials.
- C3D motion files processed through AnyBody.
- Fourier coefficients and PCA to create a parametric running model.

However, the PDF only provides the method, marker protocol, PCA summaries, and interpretation. It does not include raw C3D files, JSON outputs, Fourier coefficients, or frame-by-frame joint-angle curves.

Conclusion: we should treat the paper as the scientific design reference, not as a data source.

## Recommended Roadmap

### Phase 1: Stabilize The Visual Teaching Prototype

Goal: make the current app demo-ready for funders, coaches, and early collaborators.

Tasks:

- Keep the current procedural runner as the first demo layer.
- Improve the visual polish of the runner and overlays.
- Add short labels or tooltips for the major overlays.
- Make each teaching preset visually more distinct.
- Add a concise in-app disclaimer: visualization only, not clinical diagnosis.
- Record a short demo script showing:
  - efficient runner
  - overstride comparison
  - pelvis drop comparison
  - counter-rotation muscle activation
  - force overlay

Success criteria:

- Non-technical viewers understand the product concept within 30 seconds.
- Coaches can explain at least one form correction using the side-by-side view.
- App runs smoothly in browser on a normal laptop.

### Phase 2: Replace Procedural Motion With Real Running Animation

Goal: make the runner move like a real captured human instead of a mathematical figure.

Current data path:

1. Download official CMU Subject 9 ASF/AMC files.
2. Convert them into normalized joint-position JSON.
3. Load the JSON in the browser as a selectable motion source.
4. Preserve the existing parameter controls by applying offsets to the imported motion.

Candidate sources:

- CMU Motion Capture Database: good for animation-style running motions.  
  https://mocap.cs.cmu.edu/

- KIT Whole-Body Human Motion Database: full-body motion data, including running/searchable locomotion clips.  
  https://motion-database.humanoids.kit.edu/

Implementation tasks:

- Review CMU Subject 9 Trial 1 visually and decide whether it is demo-worthy.
- Optionally test another clean CMU run, such as Subject 141 Trial 1 or Subject 102 RunningStraight.
- Convert/retarget to a browser-friendly glTF animation if the JSON joint playback is not visually polished enough.
- Continue replacing the procedural limb motion with animation playback.
- Keep existing controls as modifiers:
  - playback speed for pace
  - gait-cycle phase for overlays
  - stride/cadence adjustments as animation warping
  - trunk/pelvis/arm offsets as additive transforms

Success criteria:

- Runner looks recognizably human and athletic.
- Foot sliding is minimal enough for a demo.
- Existing overlays still sync to the gait cycle.

### Phase 3: Add Real Biomechanics Curves

Goal: make the overlays scientifically grounded rather than purely rule-based.

Recommended datasets:

- University of Bath running dataset: full-body marker motion, ground reaction forces, IMUs, C3D files, multiple runners and speeds. Best overall target for our app.  
  https://researchdata.bath.ac.uk/1341/

- RBDS / Fukuchi running biomechanics dataset: lower-limb kinematics and kinetics, C3D and processed files. Best starter for hip/knee/ankle and ground-reaction-force patterns.  
  https://bmclab.pesquisa.ufabc.edu.br/datasets/rbds/

Implementation tasks:

- Extract normalized gait-cycle curves from public datasets.
- Start with lower-body signals:
  - hip flexion/extension
  - knee flexion
  - ankle plantarflexion
  - vertical ground reaction force
  - knee loading proxy
  - stance/swing timing
- Replace fake force pulses with dataset-derived curves.
- Replace muscle glow timing with curves mapped from real gait phases and known muscle timing.
- Keep the UI clear that these are educational estimates, not clinical measurements.

Success criteria:

- Force overlay follows a real running vertical force profile.
- Knee/ankle/hip signals change plausibly across gait phase.
- Biomechanics consultant can review the signal names without major objections.

### Phase 4: Manual Coach Mode

Goal: make the app useful before camera detection exists.

Tasks:

- Allow saving custom current-runner patterns.
- Add named comparison scenarios:
  - reference vs overstride
  - reference vs pelvis drop
  - reference vs low cadence
  - reference vs crossover
- Add a simple before/after toggle.
- Add exportable screenshots for pitch decks and coaching notes.

Success criteria:

- A coach can manually tune a runner pattern in under 2 minutes.
- The app can be used in a live explanation without camera setup.

### Phase 5: Camera Personalization

Goal: show the user's current running posture beside the reference runner.

Do this only after the visual teaching prototype is compelling.

Recommended first implementation:

- Browser camera with MediaPipe Pose Landmarker.
- Estimate simple, visible parameters:
  - cadence
  - trunk lean
  - arm swing amplitude
  - rough knee tracking
  - rough stride timing
  - rough pelvis/shoulder rhythm if camera angle allows

Avoid claiming accurate:

- ankle eversion from a single camera
- precise ground reaction force
- precise muscle activation
- clinical injury risk

Implementation tasks:

- Implement `CameraPoseProvider`.
- Add calibration step for camera angle and runner scale.
- Map pose landmarks to existing `RunnerParams`.
- Show detected user avatar beside reference avatar.
- Highlight difference bands rather than exact medical scores.

Success criteria:

- Camera mode works well enough for side-view treadmill demos.
- User can see a meaningful posture difference from the reference runner.
- App gracefully explains when camera angle or visibility is insufficient.

### Phase 6: Wearables And Hardware

Goal: improve personalization beyond what a single camera can see.

Recommended order:

1. Phone camera or webcam.
2. Optional smartwatch/phone IMU.
3. Optional footpod.
4. Optional multi-IMU setup.
5. Optional lab-grade mocap or force-plate validation.

Useful hardware signals:

- cadence
- ground contact timing
- vertical oscillation
- left/right asymmetry
- impact timing
- approximate foot strike

Do not buy expensive hardware for v1 unless funding specifically requires it. The visual teaching prototype should be interesting without sensors.

## Near-Term Priorities

Highest priority:

1. Add one real mocap running animation.
2. Add real gait-cycle force/kinematic curves from RBDS or Bath.
3. Improve anatomy overlay art.
4. Make comparison mode more presentation-ready.

Medium priority:

1. Save/load custom runner patterns.
2. Add screenshot/export mode.
3. Add a small dataset-processing script.
4. Add camera provider behind an experimental flag.

Lower priority:

1. User accounts.
2. Cloud storage.
3. Medical scoring.
4. Expensive hardware integration.
5. Full AnyBody/OpenSim surrogate model.

## Cost Guidance

Lean prototype, current path:

| Item | Estimated Cost |
|---|---:|
| Web/3D development | $5k-$10k |
| 3D artist / animation cleanup | $2k-$6k |
| Biomechanics consultant review | $750-$2.5k |
| UI polish and demo preparation | $1k-$3k |
| Public datasets | $0 |
| Mixamo/CMU/KIT starter animation | $0-$1k |
| Existing laptop/browser demo | $0 |

Likely next spend:

- Production-quality rigged runner and anatomy overlays: $2k-$8k.
- Dataset processing and biomechanics curve integration: $2k-$8k.
- Camera prototype: $2k-$8k.
- Hardware experiments: $500-$10k+, depending on ambition.

## Strategic Recommendation

Do not jump straight to camera or expensive sensors.

The best next technical step is:

1. Keep the current app structure.
2. Add real running animation from CMU or KIT.
3. Add real biomechanics curves from RBDS or Bath.
4. Use those curves to drive the overlays.
5. Then add camera personalization once the reference visualization is strong.

That path makes the prototype feel real sooner while keeping the project fundable and technically believable.
