import type { BiomechSignal, FootStrike, GaitPhase, RunnerParams } from "./types";

export const neutralRunnerParams: RunnerParams = {
  pace: 1,
  cadence: 176,
  strideLength: 1,
  verticalBounce: 0.5,
  trunkLean: 0.52,
  armSwing: 0.62,
  pelvisRotation: 0.56,
  counterRotation: 0.72,
  footStrike: "midfoot",
  pelvisDrop: 0.18,
  stepWidth: 0.48,
};

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function blendParams(a: RunnerParams, b: RunnerParams, amount: number): RunnerParams {
  const t = clamp01(amount);
  return {
    pace: lerp(a.pace, b.pace, t),
    cadence: lerp(a.cadence, b.cadence, t),
    strideLength: lerp(a.strideLength, b.strideLength, t),
    verticalBounce: lerp(a.verticalBounce, b.verticalBounce, t),
    trunkLean: lerp(a.trunkLean, b.trunkLean, t),
    armSwing: lerp(a.armSwing, b.armSwing, t),
    pelvisRotation: lerp(a.pelvisRotation, b.pelvisRotation, t),
    counterRotation: lerp(a.counterRotation, b.counterRotation, t),
    footStrike: t < 0.5 ? a.footStrike : b.footStrike,
    pelvisDrop: lerp(a.pelvisDrop, b.pelvisDrop, t),
    stepWidth: lerp(a.stepWidth, b.stepWidth, t),
  };
}

export function footStrikeBias(strike: FootStrike) {
  if (strike === "heel") return 0.9;
  if (strike === "forefoot") return 0.25;
  return 0.52;
}

export function getGaitPhase(time: number, params: RunnerParams): GaitPhase {
  const cyclesPerSecond = params.cadence / 120;
  const progress = (time * cyclesPerSecond * params.pace) % 1;
  const phasePoint = progress < 0.5 ? progress * 2 : (progress - 0.5) * 2;
  let name: GaitPhase["name"] = "swing";

  if (phasePoint < 0.14) name = "loading";
  else if (phasePoint < 0.35) name = "midstance";
  else if (phasePoint < 0.52) name = "toeOff";
  else if (phasePoint < 0.82) name = "swing";
  else name = "stance";

  return {
    progress,
    name,
    stanceLeg: progress < 0.5 ? "left" : "right",
  };
}

export function computeBiomechSignal(time: number, params: RunnerParams): BiomechSignal {
  const gait = getGaitPhase(time, params);
  const cycle = gait.progress * Math.PI * 2;
  const loadingPulse = pulse(gait.progress, 0.03, 0.1) + pulse(gait.progress, 0.53, 0.1);
  const toeOffPulse = pulse(gait.progress, 0.27, 0.14) + pulse(gait.progress, 0.77, 0.14);
  const counterTiming = Math.abs(Math.sin(cycle));
  const counterQuality = clamp01(params.counterRotation * 0.72 + params.pelvisRotation * 0.38);
  const torsoSystem = clamp01(counterTiming * counterQuality);
  const heelPenalty = params.footStrike === "heel" ? 0.22 : 0;
  const overstride = clamp01((params.strideLength - 1.04) * 1.9 + (168 - params.cadence) / 48 + heelPenalty);
  const crossover = clamp01((0.34 - params.stepWidth) * 2.6);
  const pelvisAlert = clamp01((params.pelvisDrop - 0.38) * 2.3 + crossover * 0.25);
  const landingForce = clamp01(
    loadingPulse *
      (0.55 + params.verticalBounce * 0.32 + overstride * 0.35 + footStrikeBias(params.footStrike) * 0.2),
  );

  return {
    gait,
    obliques: clamp01(torsoSystem * 0.92 + params.trunkLean * 0.14),
    lats: clamp01(torsoSystem * params.armSwing),
    glutes: clamp01(toeOffPulse * (0.54 + params.trunkLean * 0.28 + params.pelvisRotation * 0.22)),
    hipRotators: clamp01(torsoSystem * 0.55 + pelvisAlert * 0.6 + crossover * 0.35),
    spinalStabilizers: clamp01(torsoSystem * 0.5 + params.verticalBounce * 0.24 + pelvisAlert * 0.5),
    calves: clamp01(toeOffPulse * (params.footStrike === "forefoot" ? 1 : 0.74)),
    kneeLoad: clamp01(landingForce * 0.58 + overstride * 0.48 + pelvisAlert * 0.3),
    landingForce,
    pelvisDropAlert: pelvisAlert,
    overstrideAlert: overstride,
    crossoverAlert: crossover,
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function pulse(progress: number, center: number, width: number) {
  const distance = Math.min(Math.abs(progress - center), 1 - Math.abs(progress - center));
  return clamp01(1 - distance / width);
}
