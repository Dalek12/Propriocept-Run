# Propriocept Run Prototype Visual Roadmap

This is a partner-facing visual summary of the current prototype path.

## One-Line Strategy

Build the product in this order:

```text
Credible visual runner model
-> compelling teaching overlays
-> real runner motion
-> real biomechanics curves
-> manual coach comparison
-> camera personalization
-> optional sensors/hardware
```

## Current Visual Model Decision

The weakest part of the current prototype is no longer the app architecture. It is the visual quality of the runner, skeleton, and muscle layers. The best lean route is to upgrade the model art first, while keeping the two bigger routes available if funding or asset discovery changes the plan.

```mermaid
flowchart TD
  START["Current procedural runner"]
  LEAN["Best lean route<br/><br/>Rigged browser-ready humanoid<br/>Simplified skeleton<br/>Simplified muscle patches<br/>Open anatomy references"]
  FAST["Fast asset route<br/><br/>Buy or find licensed<br/>ready-made anatomy model<br/>Retarget if compatible"]
  PREMIUM["Premium custom route<br/><br/>Hire 3D artist / technical animator<br/>Custom stylized scientific runner<br/>Separate body, bone, muscle layers"]
  APP["Updated prototype<br/><br/>Better model art<br/>Same controls<br/>Same biomechanics signal engine"]

  START --> LEAN
  START -. possible option .-> FAST
  START -. possible option .-> PREMIUM
  LEAN --> APP
  FAST --> APP
  PREMIUM --> APP
```

## Product Roadmap

```mermaid
flowchart LR
  P1["Phase 1<br/>Visual Teaching Prototype<br/><br/>Procedural 3D runner<br/>Controls + overlays<br/>Manual comparison"]
  P15["Phase 1.5<br/>Visual Model Upgrade<br/><br/>Better body surface<br/>Skeleton layer<br/>Muscle/anatomy patches"]
  P2["Phase 2<br/>Real Running Motion<br/><br/>CMU / KIT mocap<br/>glTF runner animation<br/>Less artificial movement"]
  P3["Phase 3<br/>Biomechanics Curves<br/><br/>Bath / RBDS data<br/>Ground reaction force<br/>Hip / knee / ankle timing"]
  P4["Phase 4<br/>Coach Mode<br/><br/>Save patterns<br/>Before / after views<br/>Export screenshots"]
  P5["Phase 5<br/>Camera Personalization<br/><br/>MediaPipe pose<br/>User vs reference figure<br/>Posture differences"]
  P6["Phase 6<br/>Wearables + Hardware<br/><br/>IMUs / footpod<br/>Asymmetry<br/>Impact timing"]

  P1 --> P15 --> P2 --> P3 --> P4 --> P5 --> P6
```

## Visual Asset Source Map

```mermaid
flowchart TB
  BASE["Base runner body"]
  MUSCLE["Muscle/anatomy references"]
  APPMODEL["Browser model in app"]

  MH["MakeHuman / MPFB<br/>CC0 core assets<br/>Best lean base-body candidate"]
  ZA["Z-Anatomy<br/>Detailed anatomy reference<br/>CC BY-SA implications"]
  AT["AnatomyTOOL Open 3D Model<br/>Web-oriented anatomy assets<br/>CC BY-SA implications"]
  BP["BodyParts3D / Anatomography<br/>Important anatomy mesh source<br/>Needs cleanup + attribution"]
  CUSTOM["Custom simplified overlay<br/>Built for our runner<br/>Lowest browser risk"]

  MH --> BASE
  ZA --> MUSCLE
  AT --> MUSCLE
  BP --> MUSCLE
  MUSCLE --> CUSTOM
  BASE --> APPMODEL
  CUSTOM --> APPMODEL
```

## System Architecture

```mermaid
flowchart TB
  UI["User Controls<br/>pace, cadence, stride, trunk lean,<br/>pelvis drop, foot strike"]
  PRESETS["Teaching Presets<br/>efficient, overstride, bounce,<br/>low cadence, pelvis drop, crossover"]
  INPUT["Input Providers<br/>Manual now<br/>Camera later<br/>Wearables later"]
  ASSETS["Model Assets<br/>procedural fallback<br/>GLB humanoid<br/>muscle/skeleton layers"]

  PARAMS["RunnerParams<br/>shared parameter model"]
  GAIT["Gait Phase Engine<br/>stance, loading, midstance,<br/>toe-off, swing"]
  SIGNALS["Biomechanics Signals<br/>muscle glow, force arrows,<br/>knee load, pelvis alerts"]
  RENDER["3D Runner Renderer<br/>body, skeleton, muscles,<br/>force overlay, comparison"]

  UI --> PARAMS
  PRESETS --> PARAMS
  INPUT --> PARAMS
  ASSETS --> RENDER
  PARAMS --> GAIT
  GAIT --> SIGNALS
  PARAMS --> SIGNALS
  SIGNALS --> RENDER
  PARAMS --> RENDER
```

## Data Upgrade Path

```mermaid
flowchart TD
  A["Current Prototype<br/>Procedural runner<br/>Rule-based signals"]
  V["Visual Model Upgrade<br/>Better runner<br/>Better anatomy layers"]
  B["Animation Data<br/>CMU or KIT running mocap<br/>Used for natural movement"]
  C["Biomechanics Data<br/>Bath or RBDS datasets<br/>Used for force and joint curves"]
  D["Validated Model<br/>OpenSim / AnyBody-inspired processing<br/>Used for stronger scientific claims"]
  E["Personalized Input<br/>Camera or sensors<br/>Used for user-vs-reference comparison"]

  A --> V
  V --> B
  B --> C
  C --> D
  C --> E
```

## What The Original Paper Means For Us

```mermaid
flowchart LR
  PAPER["Original Paper"]
  REAL["It used real runner trials<br/>149 trials, 39 subjects,<br/>35 markers, 300 Hz"]
  MISSING["But the PDF does not include<br/>raw C3D files, JSON outputs,<br/>Fourier coefficients, or frame data"]
  ACTION["Use the paper as scientific direction<br/>Use public datasets for implementation"]

  PAPER --> REAL --> MISSING --> ACTION
```

## Near-Term Build Priorities

```mermaid
quadrantChart
  title Next Prototype Decisions
  x-axis Lower demo impact --> Higher demo impact
  y-axis Easier now --> Harder now
  quadrant-1 "High impact, harder"
  quadrant-2 "Lower impact, harder"
  quadrant-3 "Lower impact, easier"
  quadrant-4 "High impact, easier"
  "Improve runner body": [0.88, 0.38]
  "Improve muscle overlay": [0.84, 0.42]
  "Add real mocap run": [0.86, 0.58]
  "Add real force curves": [0.82, 0.72]
  "Save custom patterns": [0.52, 0.32]
  "Camera detection": [0.9, 0.88]
  "User accounts": [0.2, 0.64]
  "Hardware sensors": [0.72, 0.92]
  "Screenshot/export": [0.62, 0.26]
```

## Partner Summary

The current prototype proves the visual teaching concept, but the visual model is now the bottleneck. The strongest next upgrade is to make the runner and anatomy layers more credible before spending more time on camera detection or expensive sensors.

1. Upgrade the runner model and simplified anatomy layers.
2. Keep the best lean route as the default.
3. Keep the fast licensed-asset route and premium custom-art route as options.
4. Add real running mocap from CMU or KIT after the model can carry the visual concept.
5. Add real gait-cycle curves from Bath or RBDS.
6. Add camera personalization only after the reference visualization is compelling.

Blender is not required to run the app. It is useful later for asset cleanup, retargeting, polygon reduction, material fixes, and GLB export.
