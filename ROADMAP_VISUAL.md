# Propriocept Run Prototype Visual Roadmap

This is a partner-facing visual summary of the current prototype path.

## One-Line Strategy

Build the product in this order:

```text
Compelling visual teaching tool
→ real runner motion
→ real biomechanics curves
→ manual coach comparison
→ camera personalization
→ optional sensors/hardware
```

## Product Roadmap

```mermaid
flowchart LR
  P1["Phase 1<br/>Visual Teaching Prototype<br/><br/>Procedural 3D runner<br/>Controls + overlays<br/>Manual comparison"]
  P2["Phase 2<br/>Real Running Motion<br/><br/>CMU / KIT mocap<br/>glTF runner animation<br/>Less artificial movement"]
  P3["Phase 3<br/>Biomechanics Curves<br/><br/>Bath / RBDS data<br/>Ground reaction force<br/>Hip / knee / ankle timing"]
  P4["Phase 4<br/>Coach Mode<br/><br/>Save patterns<br/>Before / after views<br/>Export screenshots"]
  P5["Phase 5<br/>Camera Personalization<br/><br/>MediaPipe pose<br/>User vs reference figure<br/>Posture differences"]
  P6["Phase 6<br/>Wearables + Hardware<br/><br/>IMUs / footpod<br/>Asymmetry<br/>Impact timing"]

  P1 --> P2 --> P3 --> P4 --> P5 --> P6
```

## System Architecture

```mermaid
flowchart TB
  UI["User Controls<br/>pace, cadence, stride, trunk lean,<br/>pelvis drop, foot strike"]
  PRESETS["Teaching Presets<br/>efficient, overstride, bounce,<br/>low cadence, pelvis drop, crossover"]
  INPUT["Input Providers<br/>Manual now<br/>Camera later<br/>Wearables later"]

  PARAMS["RunnerParams<br/>shared parameter model"]
  GAIT["Gait Phase Engine<br/>stance, loading, midstance,<br/>toe-off, swing"]
  SIGNALS["Biomechanics Signals<br/>muscle glow, force arrows,<br/>knee load, pelvis alerts"]
  RENDER["3D Runner Renderer<br/>body, skeleton, muscles,<br/>force overlay, comparison"]

  UI --> PARAMS
  PRESETS --> PARAMS
  INPUT --> PARAMS
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
  B["Animation Data<br/>CMU or KIT running mocap<br/>Used for natural movement"]
  C["Biomechanics Data<br/>Bath or RBDS datasets<br/>Used for force and joint curves"]
  D["Validated Model<br/>OpenSim / AnyBody-inspired processing<br/>Used for stronger scientific claims"]
  E["Personalized Input<br/>Camera or sensors<br/>Used for user-vs-reference comparison"]

  A --> B
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
  "Improve overlay art": [0.78, 0.28]
  "Add real mocap run": [0.86, 0.58]
  "Add real force curves": [0.82, 0.72]
  "Save custom patterns": [0.52, 0.32]
  "Camera detection": [0.9, 0.88]
  "User accounts": [0.2, 0.64]
  "Hardware sensors": [0.72, 0.92]
  "Screenshot/export": [0.62, 0.26]
```

## Partner Summary

The current prototype proves the visual teaching concept. The next step should not be camera or hardware yet. The strongest next upgrade is to make the runner and overlays data-driven:

1. Add a real running mocap animation from CMU or KIT.
2. Add real gait-cycle curves from Bath or RBDS.
3. Use those curves to drive force arrows and muscle timing.
4. Polish comparison mode for funder and coach demos.
5. Add camera personalization only after the reference visualization is compelling.

This keeps the project fundable: it looks real, is technically believable, and avoids overpromising clinical accuracy too early.
