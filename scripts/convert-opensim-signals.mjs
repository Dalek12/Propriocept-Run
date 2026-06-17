import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "RunningSimulation_simTK");
const outputPath = path.join(rootDir, "public", "biomechanics", "opensim_hamner_subject02_cycle02.signals.json");

const rraKinematicsPath = path.join(
  sourceDir,
  "RRA",
  "RRA_cycle02_results_07",
  "subject02_running_RRA_Kinematics_q.mot",
);
const cmcStatesPath = path.join(sourceDir, "CMC", "CMC_Results", "subject02_running_CMC_states_degrees.mot");
const grfPath = path.join(sourceDir, "subject02_running_grf.mot");

const cycleStartTime = 0.7;
const cycleEndTime = 1.6;
const sampleCount = 101;

const kinematics = await readStorageTable(rraKinematicsPath);
const cmcStates = await readStorageTable(cmcStatesPath);
const grf = await readStorageTable(grfPath);

const sampleTimes = Array.from({ length: sampleCount }, (_, index) =>
  cycleStartTime + (cycleEndTime - cycleStartTime) * (index / (sampleCount - 1)),
);

const rawSamples = sampleTimes.map((time, index) => {
  const phase = index / (sampleCount - 1);
  const kinematicRow = sampleRow(kinematics.rows, time);
  const cmcRow = sampleRow(cmcStates.rows, time);
  const grfRow = sampleRow(grf.rows, time);

  const rightVertical = positive(grfRow.ground_force_vy);
  const leftVertical = positive(grfRow.ground_force_vy_2);
  const totalVertical = rightVertical + leftVertical;

  return {
    phase: round(phase, 4),
    time: round(time, 4),
    kinematics: pick(kinematicRow, [
      "pelvis_tilt",
      "pelvis_list",
      "pelvis_rotation",
      "hip_flexion_r",
      "hip_adduction_r",
      "hip_rotation_r",
      "knee_angle_r",
      "ankle_angle_r",
      "hip_flexion_l",
      "hip_adduction_l",
      "hip_rotation_l",
      "knee_angle_l",
      "ankle_angle_l",
      "lumbar_extension",
      "lumbar_bending",
      "lumbar_rotation",
      "arm_flex_r",
      "arm_add_r",
      "arm_rot_r",
      "elbow_flex_r",
      "arm_flex_l",
      "arm_add_l",
      "arm_rot_l",
      "elbow_flex_l",
    ]),
    forces: {
      rightVertical,
      leftVertical,
      totalVertical,
      rightAnteriorPosterior: grfRow.ground_force_vx,
      leftAnteriorPosterior: grfRow.ground_force_vx_2,
      rightMedialLateral: grfRow.ground_force_vz,
      leftMedialLateral: grfRow.ground_force_vz_2,
    },
    muscleGroups: {
      glutes: averageColumns(cmcRow, [
        "glut_max1_r.activation",
        "glut_max2_r.activation",
        "glut_max3_r.activation",
        "glut_med1_r.activation",
        "glut_med2_r.activation",
        "glut_med3_r.activation",
        "glut_max1_l.activation",
        "glut_max2_l.activation",
        "glut_max3_l.activation",
        "glut_med1_l.activation",
        "glut_med2_l.activation",
        "glut_med3_l.activation",
      ]),
      hipRotators: averageColumns(cmcRow, [
        "quad_fem_r.activation",
        "gem_r.activation",
        "peri_r.activation",
        "glut_min1_r.activation",
        "glut_min2_r.activation",
        "glut_min3_r.activation",
        "quad_fem_l.activation",
        "gem_l.activation",
        "peri_l.activation",
        "glut_min1_l.activation",
        "glut_min2_l.activation",
        "glut_min3_l.activation",
      ]),
      hipFlexors: averageColumns(cmcRow, [
        "iliacus_r.activation",
        "psoas_r.activation",
        "rect_fem_r.activation",
        "tfl_r.activation",
        "iliacus_l.activation",
        "psoas_l.activation",
        "rect_fem_l.activation",
        "tfl_l.activation",
      ]),
      quads: averageColumns(cmcRow, [
        "rect_fem_r.activation",
        "vas_med_r.activation",
        "vas_int_r.activation",
        "vas_lat_r.activation",
        "rect_fem_l.activation",
        "vas_med_l.activation",
        "vas_int_l.activation",
        "vas_lat_l.activation",
      ]),
      hamstrings: averageColumns(cmcRow, [
        "semimem_r.activation",
        "semiten_r.activation",
        "bifemlh_r.activation",
        "bifemsh_r.activation",
        "semimem_l.activation",
        "semiten_l.activation",
        "bifemlh_l.activation",
        "bifemsh_l.activation",
      ]),
      calves: averageColumns(cmcRow, [
        "med_gas_r.activation",
        "lat_gas_r.activation",
        "soleus_r.activation",
        "med_gas_l.activation",
        "lat_gas_l.activation",
        "soleus_l.activation",
      ]),
      tibialisAnterior: averageColumns(cmcRow, ["tib_ant_r.activation", "tib_ant_l.activation"]),
      obliques: averageColumns(cmcRow, [
        "intobl_r.activation",
        "intobl_l.activation",
        "extobl_r.activation",
        "extobl_l.activation",
      ]),
      spinalStabilizers: averageColumns(cmcRow, ["ercspn_r.activation", "ercspn_l.activation"]),
    },
  };
});

const maxTotalVertical = Math.max(...rawSamples.map((sample) => sample.forces.totalVertical), 1);
const muscleMax = {};
for (const key of Object.keys(rawSamples[0].muscleGroups)) {
  muscleMax[key] = Math.max(...rawSamples.map((sample) => sample.muscleGroups[key]), 0.0001);
}

const samples = rawSamples.map((sample) => ({
  ...sample,
  forces: {
    ...mapValues(sample.forces, round),
    totalVerticalNormalized: round(sample.forces.totalVertical / maxTotalVertical),
  },
  muscleGroups: mapValues(sample.muscleGroups, (value, key) => round(value / muscleMax[key])),
}));

const dataset = {
  id: "opensim-hamner-subject02-cycle02",
  label: "OpenSim Hamner Subject 02 Running Cycle",
  source: "Hamner, Seth, and Delp OpenSim running simulation from SimTK",
  sourceFolders: ["RunningSimulation_simTK"],
  sourceFiles: [
    relativePath(rraKinematicsPath),
    relativePath(cmcStatesPath),
    relativePath(grfPath),
  ],
  citation:
    "Hamner, S.R., Seth, A., and Delp, S.L. Muscle contributions to propulsion and support during running. Journal of Biomechanics, 2010.",
  notes: [
    "Derived file for local prototype visualization; raw SimTK/OpenSim package is intentionally not committed.",
    "The OpenSim setup files run from 0.7s to 1.6s. The included README reports a left foot-strike to left foot-strike gait-cycle duration of 0.68s.",
    "Muscle-group values are normalized within this extracted cycle and should be treated as educational visualization signals, not clinical measurements.",
  ],
  cycleStartTime,
  cycleEndTime,
  extractedWindowSeconds: round(cycleEndTime - cycleStartTime),
  reportedCycleDurationSeconds: 0.68,
  sampleCount,
  maxTotalVerticalForceNewtons: round(maxTotalVertical, 2),
  columns: {
    kinematics: Object.keys(samples[0].kinematics),
    forces: Object.keys(samples[0].forces),
    muscleGroups: Object.keys(samples[0].muscleGroups),
  },
  samples,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
console.log(`${sampleCount} samples from ${cycleStartTime}s to ${cycleEndTime}s`);
console.log(`Peak total vertical force: ${dataset.maxTotalVerticalForceNewtons} N`);

async function readStorageTable(filePath) {
  const text = await readFile(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  const headerEnd = lines.findIndex((line) => line.trim().toLowerCase() === "endheader");
  if (headerEnd === -1) throw new Error(`No endheader found in ${filePath}`);

  const columnLine = lines.slice(headerEnd + 1).find((line) => line.trim());
  if (!columnLine) throw new Error(`No column line found in ${filePath}`);
  const columns = uniquifyColumns(columnLine.trim().split(/\s+/));
  const dataStart = lines.indexOf(columnLine, headerEnd + 1) + 1;
  const rows = [];

  for (const line of lines.slice(dataStart)) {
    if (!line.trim()) continue;
    const values = line.trim().split(/\s+/).map(Number);
    if (values.length !== columns.length || values.some(Number.isNaN)) continue;
    rows.push(Object.fromEntries(columns.map((column, index) => [column, values[index]])));
  }

  if (!rows.length) throw new Error(`No data rows parsed from ${filePath}`);
  return { columns, rows };
}

function uniquifyColumns(columns) {
  const counts = new Map();
  return columns.map((column) => {
    const count = (counts.get(column) ?? 0) + 1;
    counts.set(column, count);
    return count === 1 ? column : `${column}_${count}`;
  });
}

function sampleRow(rows, time) {
  if (time <= rows[0].time) return rows[0];
  if (time >= rows[rows.length - 1].time) return rows[rows.length - 1];

  let high = rows.findIndex((row) => row.time >= time);
  if (high <= 0) return rows[0];
  const low = high - 1;
  const a = rows[low];
  const b = rows[high];
  const amount = (time - a.time) / Math.max(0.000001, b.time - a.time);
  const result = {};

  for (const key of Object.keys(a)) {
    const av = a[key];
    const bv = b[key] ?? av;
    result[key] = av + (bv - av) * amount;
  }
  return result;
}

function averageColumns(row, columns) {
  const values = columns.map((column) => row[column]).filter((value) => Number.isFinite(value));
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + positive(value), 0) / values.length;
}

function pick(row, columns) {
  return Object.fromEntries(columns.map((column) => [column, round(row[column] ?? 0)]));
}

function mapValues(object, mapper) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, mapper(value, key)]));
}

function positive(value) {
  return Math.max(0, value ?? 0);
}

function relativePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

function round(value, digits = 4) {
  return Number(value.toFixed(digits));
}
