import { neutralRunnerParams } from "./biomechanics";
import type { RunnerPreset } from "./types";

export const runnerPresets: RunnerPreset[] = [
  {
    id: "efficient",
    name: "Efficient neutral",
    description: "Balanced cadence, midfoot contact, stable pelvis, and clear shoulder-pelvis rhythm.",
    params: neutralRunnerParams,
  },
  {
    id: "overstride",
    name: "Overstrider",
    description: "Long step, lower cadence, heel-first landing, and increased knee loading signal.",
    params: {
      ...neutralRunnerParams,
      cadence: 158,
      strideLength: 1.34,
      footStrike: "heel",
      trunkLean: 0.34,
      verticalBounce: 0.62,
    },
  },
  {
    id: "bounce",
    name: "Excessive bounce",
    description: "High vertical oscillation with larger landing-force pulses.",
    params: {
      ...neutralRunnerParams,
      cadence: 170,
      verticalBounce: 0.94,
      strideLength: 1.08,
      armSwing: 0.52,
    },
  },
  {
    id: "low-cadence",
    name: "Low cadence",
    description: "Slower turnover and longer ground contact, useful for teaching rhythm changes.",
    params: {
      ...neutralRunnerParams,
      cadence: 148,
      strideLength: 1.18,
      footStrike: "heel",
      pelvisRotation: 0.44,
    },
  },
  {
    id: "upright",
    name: "Too upright",
    description: "Reduced forward trunk angle with more knee-load emphasis during landing.",
    params: {
      ...neutralRunnerParams,
      trunkLean: 0.12,
      armSwing: 0.48,
      counterRotation: 0.46,
      footStrike: "heel",
    },
  },
  {
    id: "pelvis-drop",
    name: "Pelvis drop",
    description: "Frontal-plane pelvis motion and hip-control warning glow.",
    params: {
      ...neutralRunnerParams,
      pelvisDrop: 0.74,
      stepWidth: 0.32,
      pelvisRotation: 0.66,
      verticalBounce: 0.58,
    },
  },
  {
    id: "crossover",
    name: "Narrow crossover",
    description: "Narrow step width with crossover alert and hip-rotator emphasis.",
    params: {
      ...neutralRunnerParams,
      stepWidth: 0.18,
      pelvisDrop: 0.48,
      strideLength: 1.1,
      counterRotation: 0.58,
    },
  },
];
