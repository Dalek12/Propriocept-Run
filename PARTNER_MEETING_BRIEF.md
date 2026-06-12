# Propriocept Run Partner Meeting Brief

Updated: June 12, 2026

## One-Sentence Status

Propriocept Run is currently a working browser prototype for running-form visualization, and the next best step is to improve the visual runner/anatomy model before investing further in camera detection or expensive simulation workflows.

## Current Prototype Progress

Implemented:

- React + TypeScript + Three.js / React Three Fiber web app.
- Full-screen animated runner stage.
- Adjustable running controls: pace, cadence, stride length, vertical bounce, trunk lean, arm swing, pelvis rotation, shoulder-pelvis counter-rotation, pelvis drop, step width, and foot strike.
- Teaching presets: efficient runner, overstride, excessive bounce, low cadence, upright posture, pelvis drop, and narrow crossover.
- Overlay modes: body, skeleton, muscle, force, and comparison.
- Manual side-by-side comparison mode.
- Rule-based biomechanics signal layer for gait phase, muscle glow, landing force, knee load, overstride, pelvis drop, and crossover alerts.
- Future input-provider stubs for camera pose and wearable sensors.
- First real mocap import path using CMU Subject 9 Trial 1, converted from ASF/AMC into browser-readable JSON.

Current limitation:

- The app architecture is usable, but the visual model is not yet credible enough for a strong funder-facing demo.
- The body, skeleton, and muscle overlays need a better asset strategy before the project should go deeper into camera detection or advanced biomechanics simulation.

## Current Recommendation

Use a split strategy:

1. Browser demo: upgrade the visible runner with a better GLB humanoid, simplified skeleton, and simplified muscle/anatomy layers.
2. Scientific grounding: use OpenSim first for reference biomechanics, gait curves, and model terminology.
3. Premium validation path: keep AnyBody as a later option if the project receives funding, a license, or a technical partnership.

## Model Path 1: AnyBody / Original Paper Model

The original PDF is based on an AnyBody Modeling System workflow, but it does not give us a downloadable web-ready avatar or reusable raw dataset.

What the paper model used:

| Area | Details |
|---|---|
| Source trials | 149 kinematic running trials |
| Subjects | 39 runners |
| Capture setup | Qualisys marker-based motion capture |
| Marker protocol | 35 full-body markers |
| Capture rate | 300 Hz |
| File type | C3D files from QTM |
| Processing | AnyBody Modeling System motion optimization |
| Parametric method | Fourier coefficients + PCA |
| Output described in paper | Parametric running model, not downloadable production files |

Main value for us:

- Strong conceptual reference for a future parametric runner.
- Supports the idea that a runner can be represented by adjustable parameters rather than only by fixed video clips.
- Useful for explaining the scientific direction to partners.

Main blocker:

- The paper does not include raw C3D files, JSON outputs, Fourier coefficients, PCA matrices, or a browser-ready model.
- AnyBody's AMMR repository is public, but its own README states that an AnyBody license with active maintenance is required to use the models from GitHub, and access/use is covered by their EULA.

Practical conclusion:

- Treat AnyBody as the long-term professional/scientific pathway, not the immediate prototype foundation.
- Revisit AnyBody if we have funding, licensing access, or a partnership.

## Model Path 2: OpenSim Full-Body / Running Models

OpenSim is a more practical near-term scientific reference because its model ecosystem is public and widely used in biomechanics.

Most relevant OpenSim models:

| Model | Relevance To Propriocept Run |
|---|---|
| Full Body Running Model | Strong running-specific reference. Includes legs, trunk, arms, 37 DOF, 30 lower-body muscles, and torque-actuated arms. Useful for locomotion mechanics, but upper-body muscles are simplified. |
| Rajagopal Full-Body Model | Best practical scientific candidate. Includes full-body bony geometry, 37 DOF, 80 lower-limb muscle-tendon units, and 17 ideal torque actuators for the upper body. Includes walking and running simulation material. |
| gait2392 / gait2354 | Good educational/prototyping lower-extremity models, but not ideal for the full-body visual story. |
| Lower Limb Model 2010 | Stronger lower-limb anatomy, but heavier and less appropriate as the first browser-facing model path. |

Main value for us:

- Gives us credible reference data for gait, joint kinematics, muscle timing, force patterns, and terminology.
- Better first scientific path than AnyBody because the OpenSim ecosystem is more accessible.
- The SimTK full-body model page provides model files and sample walking/running simulations, though downloads may require a free SimTK account.

Main limitation:

- OpenSim models are scientific simulation models, not polished real-time web avatars.
- They should guide our biomechanics signals and validation path, while the browser avatar should remain a separate optimized GLB/Three.js asset.

Practical conclusion:

- Use OpenSim first for scientific grounding.
- Do not try to render OpenSim directly in the browser as the main visual model.
- Have a team member register on SimTK, download the model package manually, and keep raw downloaded files out of Git until license/redistribution terms are confirmed.

## Best Lean Route For The Next Build Step

The most practical next step is not camera detection and not a full musculoskeletal simulator. It is visual credibility.

Build next:

1. Add a browser-ready GLB runner model path while preserving the current procedural model as fallback.
2. Add model source switching: procedural, imported humanoid, future premium runner.
3. Build simplified muscle/anatomy patches for the app instead of trying to ship a full medical anatomy atlas.
4. Keep biomechanics overlays driven by the existing signal engine.
5. Later, use OpenSim-derived curves to replace or refine the current rule-based signals.

Why:

- A funder or partner needs to see the product concept quickly.
- The current app logic already proves the interactive idea.
- Better visuals will make future mocap, camera, and simulation work more meaningful.

## Meeting Talking Points

- We already have a functional browser prototype, not just a concept.
- The current weak point is the visual runner/anatomy quality.
- The original AnyBody paper validates the direction, but its model/data are not directly reusable.
- OpenSim is the better first scientific model path because it is more accessible and has full-body gait/running models.
- Browser avatar and scientific model should be separate systems:
  - browser avatar for real-time visualization
  - OpenSim/AnyBody for offline reference, validation, and future signal generation
- Camera personalization should stay later, after the reference figure is visually compelling.

## References

- Local project PDF: `anybodyrun.pdf`
- AnyBody Managed Model Repository: https://github.com/anybody/ammr
- AnyBody Modeling System: https://www.anybodytech.com/software/anybodymodeling/
- OpenSim Musculoskeletal Models: https://opensimconfluence.atlassian.net/wiki/spaces/OpenSim/pages/53090607/Musculoskeletal+Models
- SimTK Full Body Model for Dynamic Simulations of Human Gait: https://simtk.org/projects/full_body
- OpenSim homepage: https://opensim.stanford.edu/
- SimTK OpenSim project: https://simtk.org/projects/opensim
