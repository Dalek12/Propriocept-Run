# OpenSim Asset Audit

Updated: June 16, 2026

## Downloaded Folders

The local workspace now contains two OpenSim download folders:

- `RunningSimulation_simTK/`
- `02FullBodyModel-latest/`

These folders are intentionally ignored by Git because they are third-party downloaded model/data packages. We should commit our notes, parsers, and derived lightweight demo files only after confirming redistribution terms.

## High-Level Finding

`RunningSimulation_simTK/` is the useful package for Propriocept Run. It contains a complete Hamner/Seth/Delp OpenSim running workflow with model files, measured marker trajectories, measured ground reaction forces, inverse kinematics, residual reduction outputs, and computed muscle-control results.

`02FullBodyModel-latest/` is useful as a clean standalone model reference, but by itself it does not include running motion, ground reaction forces, or computed muscle activations.

## Folder 1: RunningSimulation_simTK

Approximate size: 118 MB.

File types:

| Type | Count | Usefulness |
|---|---:|---|
| `.sto` | 20 | High. State, control, activation, force, speed, and power outputs. |
| `.xml` | 16 | Medium. OpenSim setup files for scale, IK, RRA, and CMC workflows. |
| `.mot` | 9 | High. Motion, kinematics, GRF, and states in motion-table form. |
| `.osim` | 6 | High as model metadata; not a web avatar. |
| `.trc` | 4 | Medium-high. Marker trajectories for static/running trials. |
| `.pdf` | 1 | High context. README describing the workflow and files. |
| `.vtp` | 1 | Low-medium. Torso display geometry only. |
| `.xlsx` | 1 | Medium. Mass properties of the model. |

README summary:

- The package generates a three-dimensional, muscle-actuated running simulation.
- Workflow: scale generic model -> inverse kinematics -> residual reduction algorithm -> computed muscle control.
- The simulation was originally generated in OpenSim 1.5.5 and regenerated in OpenSim 2.0.
- The simulated gait cycle begins at left foot-strike and ends at the next left foot-strike.
- The gait cycle duration is 0.68 seconds.
- Foot-strike and toe-off events were determined from measured ground reaction force data.
- Core citation: Hamner, Seth, and Delp, "Muscle contributions to propulsion and support during running," Journal of Biomechanics, 2010.

Most useful files:

| File | What It Gives Us | Project Use |
|---|---|---|
| `subject02_running_grf.mot` | Measured ground reaction force and center-of-pressure style force columns. | Replace fake force arrow timing with real running force curves. |
| `IK/subject02_running_arms_ik.mot` | About 10 seconds of full-body inverse-kinematics running motion with pelvis, hip, knee, ankle, lumbar, arm, elbow, wrist, and marker columns. | Candidate source for natural reference motion or for validating current CMU motion. |
| `RRA/RRA_cycle02_results_07/subject02_running_RRA_Kinematics_q.mot` | One dynamically adjusted running cycle with 37 coordinates. | Best compact kinematic source for a normalized gait-cycle curve. |
| `RRA/RRA_cycle02_results_07/subject02_running_RRA_states_degrees.mot` | RRA states in degrees, including coordinate positions and speeds. | Good for deriving pelvis/trunk/limb timing for overlays. |
| `CMC/CMC_Results/subject02_running_CMC_states_degrees.mot` | 259 columns including joint coordinates, speeds, muscle activations, and fiber lengths. | Best source for muscle activation timing. |
| `CMC/CMC_Results/subject02_running_CMC_controls.sto` | 122 columns of muscle excitations and reserve actuator excitations. | Useful secondary signal source for muscle glow and effort visualization. |
| `FullBodyModel_Hamner2010_v2_0.osim` | Generic OpenSim model with bodies, joints, coordinates, muscles, and markers. | Model metadata and muscle naming reference. |
| `RRA/subject02_running_RRA_cycle02_07_v2_0.osim` | RRA-adjusted subject model. | Better model reference for the included running cycle. |

Parsed model facts from the v2 OpenSim files:

- Model name: `3D Gait Model with Simple Arms`
- Bodies: 21
- Coordinates: 37
- Markers: 83 in the generic/standalone model, 46 in the subject-specific RRA/scaled model
- Muscle entries: 94 including defaults; effectively lower-body muscles plus trunk muscles
- Important coordinates:
  - pelvis translation and rotation
  - hip flexion/adduction/rotation
  - knee angle
  - ankle angle
  - subtalar and MTP joints
  - lumbar extension/bending/rotation
  - arm flexion/adduction/rotation
  - elbow flexion
  - wrist/pro-supination/wrist coordinates
- Important muscle activation groups present in CMC states:
  - gluteus medius/minimus/maximus
  - hamstrings
  - adductors
  - tensor fasciae latae
  - iliacus and psoas
  - quadratus femoris, gemelli, piriformis
  - rectus femoris and vasti
  - gastrocnemius and soleus
  - tibialis anterior/posterior and foot/ankle muscles
  - erector spinae
  - internal and external obliques

Why this matters:

This package can directly improve our current rule-based overlay engine. In particular, it gives real timing curves for calves, glutes, hip stabilizers, obliques, and erector spinae. That is much closer to the "inside a good runner's body" effect than the CMU mocap files alone.

## Folder 2: 02FullBodyModel-latest

Approximate size: 0.8 MB.

Files:

| File | Usefulness |
|---|---|
| `FullBodyModel_SimpleArms_Hamner2010_Markers_v2_0.osim` | Clean standalone model reference. Same general Hamner-style full-body/simple-arms model. |
| `hat_ribs_scap.vtp` | Torso display geometry only. Useful for reference, not enough for our visual avatar. |

Parsed model facts:

- Model name: `3D Gait Model with Simple Arms`
- Bodies: 21
- Coordinates: 37
- Markers: 83
- Muscle entries: 94 including defaults
- Same major coordinate set as the running simulation model

Usefulness:

- Good baseline `.osim` model for reading coordinate names, muscle names, marker names, and citations.
- Not enough by itself for our app because it does not include running motion, GRF, or muscle activation results.
- Not a polished visual model. It should not replace our GLB runner.

## What We Should Use

Use immediately:

1. `subject02_running_grf.mot` for force overlay timing.
2. `RRA/.../subject02_running_RRA_Kinematics_q.mot` for normalized running-cycle joint curves.
3. `CMC/.../subject02_running_CMC_states_degrees.mot` for muscle activation timing.
4. `.osim` coordinate and muscle names to standardize our internal signal labels.

Use later:

1. `.trc` marker trajectories for deeper motion validation.
2. `CMC` force/speed/power `.sto` files for advanced overlay modes.
3. RRA/CMC setup XML files if we install OpenSim and rerun simulations.

Do not use directly in the browser:

1. Raw `.osim` model as a visible avatar.
2. Raw `.sto/.mot` files at full size.
3. The `.vtp` torso geometry as the main model.

## Recommended Conversion Target

Create a lightweight derived JSON file such as:

`public/biomechanics/opensim_hamner_subject02_cycle02.signals.json`

Suggested contents:

- `source`: Hamner/Seth/Delp OpenSim running simulation
- `cycleDurationSec`: 0.68
- `samples`: 101 normalized gait-cycle samples from 0 to 1
- `kinematics`:
  - pelvis rotation/list/tilt
  - hip flexion/adduction/rotation left/right
  - knee angle left/right
  - ankle angle left/right
  - lumbar extension/bending/rotation
  - arm flexion left/right
  - elbow flexion left/right
- `forces`:
  - vertical ground reaction force left/right if separable
  - anterior-posterior and medial-lateral force proxies if stable
- `muscleGroups`:
  - glutes
  - hip rotators
  - hip flexors
  - quads
  - hamstrings
  - calves
  - tibialis anterior
  - obliques
  - spinal stabilizers

## Recommended App Integration

Keep the OpenSim material as an offline reference layer.

Implementation order:

1. Build a parser for OpenSim `.mot/.sto` storage tables.
2. Extract one normalized gait-cycle JSON from the Hamner running simulation.
3. Replace our fake force pulse with the measured GRF curve.
4. Replace muscle glow phase guesses with OpenSim activation curves.
5. Keep the current procedural/GLB runner as the visible avatar.
6. Use OpenSim curves only to drive overlays and labels.

## Key Decision

The OpenSim download is more useful for biomechanics overlays than for visual model replacement.

Best project use:

- OpenSim = offline truth/reference curves.
- Three.js/GLB avatar = real-time visual experience.
- Existing rule engine = bridge between user controls and educational overlays.

This supports the current roadmap: improve the visible model separately, then use OpenSim-derived curves to make the internal dynamics feel real.
