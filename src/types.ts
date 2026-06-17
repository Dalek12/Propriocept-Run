export type FootStrike = "heel" | "midfoot" | "forefoot";
export type OverlayMode = "skin" | "skeleton" | "muscle" | "force" | "comparison";
export type ViewMode = "side" | "front" | "threeQuarter" | "top";
export type GaitPhaseName = "stance" | "loading" | "midstance" | "toeOff" | "swing";
export type InputProviderKind = "manual" | "cameraPose" | "wearableSensor";
export type MotionSource = "procedural" | "cmu";

export type OpenSimMuscleGroup =
  | "glutes"
  | "hipRotators"
  | "hipFlexors"
  | "quads"
  | "hamstrings"
  | "calves"
  | "tibialisAnterior"
  | "obliques"
  | "spinalStabilizers";

export type MotionJointKey =
  | "pelvis"
  | "chest"
  | "neck"
  | "head"
  | "leftHip"
  | "rightHip"
  | "leftKnee"
  | "rightKnee"
  | "leftAnkle"
  | "rightAnkle"
  | "leftShoulder"
  | "rightShoulder"
  | "leftElbow"
  | "rightElbow"
  | "leftHand"
  | "rightHand";

export interface RunnerParams {
  pace: number;
  cadence: number;
  strideLength: number;
  verticalBounce: number;
  trunkLean: number;
  armSwing: number;
  pelvisRotation: number;
  counterRotation: number;
  footStrike: FootStrike;
  pelvisDrop: number;
  stepWidth: number;
}

export interface GaitPhase {
  progress: number;
  name: GaitPhaseName;
  stanceLeg: "left" | "right";
}

export interface BiomechSignal {
  gait: GaitPhase;
  obliques: number;
  lats: number;
  glutes: number;
  hipRotators: number;
  spinalStabilizers: number;
  calves: number;
  kneeLoad: number;
  landingForce: number;
  pelvisDropAlert: number;
  overstrideAlert: number;
  crossoverAlert: number;
}

export interface RunnerPreset {
  id: string;
  name: string;
  description: string;
  params: RunnerParams;
}

export interface RunnerInputProvider {
  kind: InputProviderKind;
  label: string;
  getParams(): RunnerParams;
}

export interface MotionFrame {
  index: number;
  phase: number;
  joints: Record<MotionJointKey, [number, number, number]>;
}

export interface MotionClip {
  id: string;
  label: string;
  source: string;
  subject: string;
  trial: string;
  fps: number;
  frameCount: number;
  durationSeconds: number;
  sourceFiles: string[];
  joints: MotionJointKey[];
  frames: MotionFrame[];
}

export interface OpenSimSignalSample {
  phase: number;
  time: number;
  kinematics: Record<string, number>;
  forces: {
    rightVertical: number;
    leftVertical: number;
    totalVertical: number;
    rightAnteriorPosterior: number;
    leftAnteriorPosterior: number;
    rightMedialLateral: number;
    leftMedialLateral: number;
    totalVerticalNormalized: number;
  };
  muscleGroups: Record<OpenSimMuscleGroup, number>;
}

export interface OpenSimSignalDataset {
  id: string;
  label: string;
  source: string;
  sourceFolders: string[];
  sourceFiles: string[];
  citation: string;
  notes: string[];
  cycleStartTime: number;
  cycleEndTime: number;
  extractedWindowSeconds: number;
  reportedCycleDurationSeconds: number;
  sampleCount: number;
  maxTotalVerticalForceNewtons: number;
  columns: {
    kinematics: string[];
    forces: string[];
    muscleGroups: OpenSimMuscleGroup[];
  };
  samples: OpenSimSignalSample[];
}
