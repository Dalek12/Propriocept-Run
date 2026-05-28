import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as THREE from "three";

const rootDir = process.cwd();
const asfPath = path.join(rootDir, "public", "mocap", "cmu", "09.asf");
const amcPath = path.join(rootDir, "public", "mocap", "cmu", "09_01.amc");
const outputPath = path.join(rootDir, "public", "mocap", "cmu", "09_01_run.motion.json");

const selectedJoints = [
  "pelvis",
  "chest",
  "neck",
  "head",
  "leftHip",
  "rightHip",
  "leftKnee",
  "rightKnee",
  "leftAnkle",
  "rightAnkle",
  "leftShoulder",
  "rightShoulder",
  "leftElbow",
  "rightElbow",
  "leftHand",
  "rightHand",
];

const boneToJoint = {
  root: "pelvis",
  lowerback: "chest",
  thorax: "neck",
  head: "head",
  lhipjoint: "leftHip",
  rhipjoint: "rightHip",
  lfemur: "leftKnee",
  rfemur: "rightKnee",
  ltibia: "leftAnkle",
  rtibia: "rightAnkle",
  lclavicle: "leftShoulder",
  rclavicle: "rightShoulder",
  lhumerus: "leftElbow",
  rhumerus: "rightElbow",
  lradius: "leftHand",
  rradius: "rightHand",
};

const asfText = await readFile(asfPath, "utf8");
const amcText = await readFile(amcPath, "utf8");
const skeleton = parseAsf(asfText);
const rawFrames = parseAmc(amcText);
const worldFrames = rawFrames.map((frame) => solveFrame(skeleton, frame));
const normalizedFrames = normalizeFrames(worldFrames);

const clip = {
  id: "cmu-09-01-run",
  label: "CMU Subject 9 Trial 1 Run",
  source: "Carnegie Mellon University Graphics Lab Motion Capture Database",
  subject: "09",
  trial: "01",
  fps: 120,
  frameCount: normalizedFrames.length,
  durationSeconds: Number((normalizedFrames.length / 120).toFixed(3)),
  sourceFiles: ["public/mocap/cmu/09.asf", "public/mocap/cmu/09_01.amc"],
  joints: selectedJoints,
  frames: normalizedFrames,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(clip, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
console.log(`${clip.frameCount} frames at ${clip.fps} fps (${clip.durationSeconds}s)`);

function parseAsf(text) {
  const lines = text.split(/\r?\n/);
  const bones = new Map();
  const hierarchy = new Map();
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (line === "begin" && lines[i - 1]?.trim() !== ":hierarchy") {
      const bone = {};
      i += 1;
      while (i < lines.length && lines[i].trim() !== "end") {
        const parts = lines[i].trim().split(/\s+/);
        if (parts[0] === "name") bone.name = parts[1];
        if (parts[0] === "direction") bone.direction = new THREE.Vector3(Number(parts[1]), Number(parts[2]), Number(parts[3]));
        if (parts[0] === "length") bone.length = Number(parts[1]);
        if (parts[0] === "axis") bone.axis = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
        if (parts[0] === "dof") bone.dof = parts.slice(1);
        i += 1;
      }
      if (bone.name) {
        bones.set(bone.name, {
          direction: bone.direction ?? new THREE.Vector3(),
          length: bone.length ?? 0,
          axis: bone.axis ?? [0, 0, 0],
          dof: bone.dof ?? [],
        });
      }
    }
    if (line === ":hierarchy") {
      i += 2;
      while (i < lines.length && lines[i].trim() !== "end") {
        const parts = lines[i].trim().split(/\s+/).filter(Boolean);
        if (parts.length > 1) hierarchy.set(parts[0], parts.slice(1));
        i += 1;
      }
    }
    i += 1;
  }

  return { bones, hierarchy };
}

function parseAmc(text) {
  const frames = [];
  let current = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith(":")) continue;
    if (/^\d+$/.test(line)) {
      if (current) frames.push(current);
      current = { index: Number(line), channels: new Map() };
      continue;
    }
    if (!current) continue;
    const parts = line.split(/\s+/);
    current.channels.set(parts[0], parts.slice(1).map(Number));
  }

  if (current) frames.push(current);
  return frames;
}

function solveFrame(skeleton, frame) {
  const channels = frame.channels;
  const rootValues = channels.get("root") ?? [0, 0, 0, 0, 0, 0];
  const rootPosition = new THREE.Vector3(rootValues[0], rootValues[1], rootValues[2]);
  const rootRotation = eulerMatrix(rootValues.slice(3, 6));
  const joints = { root: rootPosition.clone() };

  walkBone("root", rootPosition, rootRotation);

  const mapped = {};
  for (const [bone, joint] of Object.entries(boneToJoint)) {
    mapped[joint] = (joints[bone] ?? rootPosition).clone();
  }
  mapped.pelvis = rootPosition.clone();
  mapped.neck = midpoint(mapped.neck, mapped.head, 0.45);
  mapped.chest = midpoint(mapped.pelvis, mapped.neck, 0.68);
  return { index: frame.index, joints: mapped };

  function walkBone(parentName, parentPosition, parentRotation) {
    for (const childName of skeleton.hierarchy.get(parentName) ?? []) {
      const bone = skeleton.bones.get(childName);
      if (!bone) continue;
      const offset = bone.direction.clone().multiplyScalar(bone.length).applyMatrix4(parentRotation);
      const jointPosition = parentPosition.clone().add(offset);
      const axis = eulerMatrix(bone.axis);
      const channelRotation = channelMatrix(bone.dof, channels.get(childName) ?? []);
      const localRotation = axis.clone().multiply(channelRotation).multiply(axis.clone().invert());
      const worldRotation = parentRotation.clone().multiply(localRotation);
      joints[childName] = jointPosition;
      walkBone(childName, jointPosition, worldRotation);
    }
  }
}

function normalizeFrames(frames) {
  const values = frames.flatMap((frame) => selectedJoints.map((joint) => frame.joints[joint]));
  const minY = Math.min(...values.map((v) => v.y));
  const maxY = Math.max(...values.map((v) => v.y));
  const scale = 1.72 / Math.max(1, maxY - minY);

  return frames.map((frame, frameIndex) => {
    const root = frame.joints.pelvis;
    const joints = {};
    for (const joint of selectedJoints) {
      const p = frame.joints[joint] ?? root;
      joints[joint] = [
        round((p.z - root.z) * scale),
        round((p.y - minY) * scale + 0.02),
        round((p.x - root.x) * scale),
      ];
    }
    return {
      index: frame.index,
      phase: round(frameIndex / Math.max(1, frames.length - 1), 5),
      joints,
    };
  });
}

function channelMatrix(dof, values) {
  const angles = { rx: 0, ry: 0, rz: 0 };
  dof.forEach((key, index) => {
    angles[key] = values[index] ?? 0;
  });
  return eulerMatrix([angles.rx, angles.ry, angles.rz]);
}

function eulerMatrix(values) {
  const euler = new THREE.Euler(...values.map(THREE.MathUtils.degToRad), "XYZ");
  return new THREE.Matrix4().makeRotationFromEuler(euler);
}

function midpoint(a, b, amount) {
  return a.clone().lerp(b, amount);
}

function round(value, digits = 4) {
  return Number(value.toFixed(digits));
}
