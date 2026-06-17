import type { BiomechSignal, FootStrike, GaitPhase, OpenSimSignalDataset, OpenSimSignalSample, RunnerParams } from "./types";

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

export function computeBiomechSignal(time: number, params: RunnerParams, openSimSignals?: OpenSimSignalDataset | null): BiomechSignal {
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

  const openSim = sampleOpenSimSignals(openSimSignals, gait.progress);
  const dataLandingForce = openSim
    ? clamp01(openSim.forces.totalVerticalNormalized * (0.72 + params.verticalBounce * 0.18 + overstride * 0.24))
    : landingForce;
  const dataObliques = openSim ? clamp01(openSim.muscleGroups.obliques * 0.82 + torsoSystem * 0.22) : null;
  const dataGlutes = openSim
    ? clamp01(openSim.muscleGroups.glutes * (0.62 + params.trunkLean * 0.18 + params.pelvisRotation * 0.16) + toeOffPulse * 0.12)
    : null;
  const dataHipRotators = openSim
    ? clamp01(openSim.muscleGroups.hipRotators * 0.72 + pelvisAlert * 0.48 + crossover * 0.26)
    : null;
  const dataHipFlexors = openSim
    ? clamp01(openSim.muscleGroups.hipFlexors * 0.8 + Math.max(0, Math.sin(cycle + Math.PI * 0.2)) * 0.12)
    : null;
  const dataQuads = openSim ? clamp01(openSim.muscleGroups.quads * 0.82 + dataLandingForce * 0.16) : null;
  const dataHamstrings = openSim
    ? clamp01(openSim.muscleGroups.hamstrings * 0.82 + Math.max(0, Math.sin(cycle + Math.PI * 0.7)) * 0.12)
    : null;
  const dataSpinalStabilizers = openSim
    ? clamp01(openSim.muscleGroups.spinalStabilizers * 0.76 + torsoSystem * 0.18 + pelvisAlert * 0.34)
    : null;
  const dataCalves = openSim
    ? clamp01(openSim.muscleGroups.calves * (params.footStrike === "forefoot" ? 1 : 0.78) + toeOffPulse * 0.12)
    : null;
  const dataTibialisAnterior = openSim
    ? clamp01(openSim.muscleGroups.tibialisAnterior * 0.86 + Math.max(0, Math.sin(cycle + Math.PI)) * 0.08)
    : null;

  return {
    gait,
    obliques: dataObliques ?? clamp01(torsoSystem * 0.92 + params.trunkLean * 0.14),
    lats: clamp01(torsoSystem * params.armSwing),
    glutes: dataGlutes ?? clamp01(toeOffPulse * (0.54 + params.trunkLean * 0.28 + params.pelvisRotation * 0.22)),
    hipRotators: dataHipRotators ?? clamp01(torsoSystem * 0.55 + pelvisAlert * 0.6 + crossover * 0.35),
    hipFlexors: dataHipFlexors ?? clamp01(Math.max(0, Math.sin(cycle + Math.PI * 0.15)) * 0.62 + params.strideLength * 0.12),
    quads: dataQuads ?? clamp01(landingForce * 0.42 + Math.max(0, Math.sin(cycle + Math.PI * 0.05)) * 0.4),
    hamstrings: dataHamstrings ?? clamp01(toeOffPulse * 0.34 + Math.max(0, Math.sin(cycle + Math.PI * 0.7)) * 0.42),
    spinalStabilizers:
      dataSpinalStabilizers ?? clamp01(torsoSystem * 0.5 + params.verticalBounce * 0.24 + pelvisAlert * 0.5),
    calves: dataCalves ?? clamp01(toeOffPulse * (params.footStrike === "forefoot" ? 1 : 0.74)),
    tibialisAnterior: dataTibialisAnterior ?? clamp01(Math.max(0, Math.sin(cycle + Math.PI)) * 0.54),
    kneeLoad: clamp01(dataLandingForce * 0.58 + overstride * 0.48 + pelvisAlert * 0.3),
    landingForce: dataLandingForce,
    pelvisDropAlert: pelvisAlert,
    overstrideAlert: overstride,
    crossoverAlert: crossover,
  };
}

export function sampleOpenSimSignals(
  dataset: OpenSimSignalDataset | null | undefined,
  phase: number,
): OpenSimSignalSample | null {
  if (!dataset?.samples.length) return null;
  const samples = dataset.samples;
  const wrappedPhase = ((phase % 1) + 1) % 1;
  const scaled = wrappedPhase * (samples.length - 1);
  const lowIndex = Math.floor(scaled);
  const highIndex = Math.min(samples.length - 1, lowIndex + 1);
  const amount = scaled - lowIndex;
  return blendOpenSimSamples(samples[lowIndex], samples[highIndex], amount);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function blendOpenSimSamples(a: OpenSimSignalSample, b: OpenSimSignalSample, amount: number): OpenSimSignalSample {
  return {
    phase: lerp(a.phase, b.phase, amount),
    time: lerp(a.time, b.time, amount),
    kinematics: blendRecord(a.kinematics, b.kinematics, amount),
    forces: blendRecord(a.forces, b.forces, amount) as OpenSimSignalSample["forces"],
    muscleGroups: blendRecord(a.muscleGroups, b.muscleGroups, amount) as OpenSimSignalSample["muscleGroups"],
  };
}

function blendRecord(a: Record<string, number>, b: Record<string, number>, amount: number) {
  const result: Record<string, number> = {};
  for (const key of Object.keys(a)) {
    result[key] = lerp(a[key], b[key] ?? a[key], amount);
  }
  return result;
}

function pulse(progress: number, center: number, width: number) {
  const distance = Math.min(Math.abs(progress - center), 1 - Math.abs(progress - center));
  return clamp01(1 - distance / width);
}
