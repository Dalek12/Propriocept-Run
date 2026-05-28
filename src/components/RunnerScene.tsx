import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { computeBiomechSignal, footStrikeBias, neutralRunnerParams } from "../biomechanics";
import type { BiomechSignal, MotionClip, OverlayMode, RunnerParams, ViewMode } from "../types";

interface RunnerSceneProps {
  comparison: boolean;
  motionClip: MotionClip | null;
  overlay: OverlayMode;
  params: RunnerParams;
  referenceParams: RunnerParams;
  viewMode: ViewMode;
}

const cameraByView: Record<ViewMode, [number, number, number]> = {
  side: [0, 1.75, 6.2],
  front: [5.4, 1.75, 0],
  threeQuarter: [4.2, 2.2, 5.4],
  top: [0.1, 7.2, 0.1],
};

export default function RunnerScene({ comparison, motionClip, overlay, params, referenceParams, viewMode }: RunnerSceneProps) {
  const cameraPosition = cameraByView[viewMode];

  return (
    <div className="canvas-wrap">
      <Canvas camera={{ fov: 38, position: cameraPosition }} dpr={[1, 1.7]} shadows>
        <color attach="background" args={["#09100f"]} />
        <fog attach="fog" args={["#09100f", 6, 13]} />
        <ambientLight intensity={0.75} />
        <directionalLight castShadow intensity={2.1} position={[4, 5, 4]} shadow-mapSize={[1024, 1024]} />
        <pointLight color="#f5c15a" intensity={25} position={[-3, 2.6, 2.2]} />
        <pointLight color="#2fc5a8" intensity={18} position={[3.2, 2.2, -2.6]} />
        <CameraRig viewMode={viewMode} />
        <Ground />
        <TrackLines />
        {comparison ? (
          <>
            <RunnerFigure label="reference" motionClip={motionClip} overlay="muscle" params={referenceParams} side="reference" />
            <RunnerFigure label="current" motionClip={motionClip} overlay={overlay} params={params} side="current" />
          </>
        ) : (
          <RunnerFigure label="runner" motionClip={motionClip} overlay={overlay} params={params} side="single" />
        )}
      </Canvas>
    </div>
  );
}

function CameraRig({ viewMode }: { viewMode: ViewMode }) {
  useFrame(({ camera }) => {
    const target = new THREE.Vector3(...cameraByView[viewMode]);
    camera.position.lerp(target, 0.08);
    camera.lookAt(0, 1.15, 0);
  });
  return null;
}

function RunnerFigure({
  label,
  motionClip,
  overlay,
  params,
  side,
}: {
  label: string;
  motionClip: MotionClip | null;
  overlay: OverlayMode;
  params: RunnerParams;
  side: "current" | "reference" | "single";
}) {
  const group = useRef<THREE.Group>(null);
  const labelPosition = side === "reference" ? -1.45 : side === "current" ? 1.45 : 0;
  const tint = side === "reference" ? "#78d7ff" : "#ffffff";

  useFrame(({ clock }) => {
    if (!group.current) return;
    const time = clock.elapsedTime;
    group.current.position.y = Math.sin(time * 0.7) * 0.006;
  });

  return (
    <group ref={group} position={[labelPosition, 0, 0]}>
      <RunnerBody motionClip={motionClip} overlay={overlay} params={params} tint={tint} />
      <RunnerLabel label={label} />
    </group>
  );
}

function RunnerBody({
  motionClip,
  overlay,
  params,
  tint,
}: {
  motionClip: MotionClip | null;
  overlay: OverlayMode;
  params: RunnerParams;
  tint: string;
}) {
  const body = useRef<THREE.Group>(null);
  const skeleton = overlay === "skeleton" || overlay === "muscle" || overlay === "force" || overlay === "comparison";
  const muscle = overlay === "muscle" || overlay === "comparison";
  const force = overlay === "force" || overlay === "comparison";

  useFrame(({ clock }) => {
    if (!body.current) return;
    const t = clock.elapsedTime;
    body.current.userData.pose = getPose(t, params, motionClip);
    body.current.userData.signal = computeBiomechSignal(t, params);
  });

  return (
    <group ref={body}>
      <AnimatedBodyContent force={force} motionClip={motionClip} muscle={muscle} params={params} skeleton={skeleton} tint={tint} />
    </group>
  );
}

function AnimatedBodyContent({
  force,
  motionClip,
  muscle,
  params,
  skeleton,
  tint,
}: {
  force: boolean;
  motionClip: MotionClip | null;
  muscle: boolean;
  params: RunnerParams;
  skeleton: boolean;
  tint: string;
}) {
  const root = useRef<THREE.Group>(null);
  const [limbMaterial, skinMaterial, skeletonMaterial] = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ color: tint, roughness: 0.55, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({
        color: "#d7f7ef",
        depthWrite: !skeleton,
        transparent: true,
        opacity: skeleton ? 0.16 : 0.82,
        roughness: 0.62,
      }),
      new THREE.MeshStandardMaterial({ color: "#eef7f4", emissive: "#18443c", emissiveIntensity: 0.25 }),
    ],
    [skeleton, tint],
  );

  useFrame(({ clock }) => {
    if (!root.current) return;
    const pose = getPose(clock.elapsedTime, params, motionClip);
    const signal = computeBiomechSignal(clock.elapsedTime, params);
    root.current.userData.pose = pose;
    root.current.userData.signal = signal;
  });

  return (
    <group ref={root}>
      <PoseRenderer
        force={force}
        limbMaterial={limbMaterial}
        motionClip={motionClip}
        muscle={muscle}
        params={params}
        skeleton={skeleton}
        skeletonMaterial={skeletonMaterial}
        skinMaterial={skinMaterial}
      />
    </group>
  );
}

function PoseRenderer({
  force,
  limbMaterial,
  motionClip,
  muscle,
  params,
  skeleton,
  skeletonMaterial,
  skinMaterial,
}: {
  force: boolean;
  limbMaterial: THREE.Material;
  motionClip: MotionClip | null;
  muscle: boolean;
  params: RunnerParams;
  skeleton: boolean;
  skeletonMaterial: THREE.Material;
  skinMaterial: THREE.Material;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const pose = getPose(clock.elapsedTime, params, motionClip);
    const signal = computeBiomechSignal(clock.elapsedTime, params);
    group.current.children.forEach((child) => {
      child.userData.update?.(pose, signal);
    });
  });

  return (
    <group ref={group}>
      <DynamicLimb from="pelvis" material={skinMaterial} radius={0.18} to="chest" />
      <DynamicLimb from="neck" material={skinMaterial} radius={0.08} to="head" />
      <DynamicSphere joint="head" material={skinMaterial} radius={0.15} />
      <DynamicSphere joint="pelvis" material={skinMaterial} radius={0.13} scale={[1.4, 0.8, 1.15]} />
      <DynamicSphere joint="chest" material={skinMaterial} radius={0.16} scale={[1.45, 1.05, 1.55]} />

      {skeleton && (
        <>
          <DynamicLimb from="leftHip" material={skeletonMaterial} radius={0.035} to="leftKnee" />
          <DynamicLimb from="leftKnee" material={skeletonMaterial} radius={0.032} to="leftAnkle" />
          <DynamicLimb from="rightHip" material={skeletonMaterial} radius={0.035} to="rightKnee" />
          <DynamicLimb from="rightKnee" material={skeletonMaterial} radius={0.032} to="rightAnkle" />
          <DynamicLimb from="leftShoulder" material={skeletonMaterial} radius={0.03} to="leftElbow" />
          <DynamicLimb from="leftElbow" material={skeletonMaterial} radius={0.028} to="leftHand" />
          <DynamicLimb from="rightShoulder" material={skeletonMaterial} radius={0.03} to="rightElbow" />
          <DynamicLimb from="rightElbow" material={skeletonMaterial} radius={0.028} to="rightHand" />
          <DynamicLimb from="chest" material={skeletonMaterial} radius={0.026} to="neck" />
          <DynamicLimb from="leftShoulder" material={skeletonMaterial} radius={0.025} to="rightShoulder" />
          <DynamicLimb from="leftHip" material={skeletonMaterial} radius={0.025} to="rightHip" />
          {(
            [
              "leftKnee",
              "rightKnee",
              "leftAnkle",
              "rightAnkle",
              "leftHip",
              "rightHip",
              "leftElbow",
              "rightElbow",
              "leftHand",
              "rightHand",
            ] as JointKey[]
          ).map((joint) => (
            <DynamicSphere joint={joint} key={joint} material={skeletonMaterial} radius={0.052} />
          ))}
        </>
      )}

      {!skeleton && (
        <>
          <DynamicLimb from="leftHip" material={limbMaterial} radius={0.078} to="leftKnee" />
          <DynamicLimb from="leftKnee" material={limbMaterial} radius={0.064} to="leftAnkle" />
          <DynamicLimb from="rightHip" material={limbMaterial} radius={0.078} to="rightKnee" />
          <DynamicLimb from="rightKnee" material={limbMaterial} radius={0.064} to="rightAnkle" />
          <DynamicLimb from="leftShoulder" material={limbMaterial} radius={0.052} to="leftElbow" />
          <DynamicLimb from="leftElbow" material={limbMaterial} radius={0.044} to="leftHand" />
          <DynamicLimb from="rightShoulder" material={limbMaterial} radius={0.052} to="rightElbow" />
          <DynamicLimb from="rightElbow" material={limbMaterial} radius={0.044} to="rightHand" />
        </>
      )}

      {muscle && <MuscleOverlay />}
      {force && <ForceOverlay />}
    </group>
  );
}

type JointKey = keyof ReturnType<typeof getPose>;

function DynamicLimb({
  from,
  material,
  radius,
  to,
}: {
  from: JointKey;
  material: THREE.Material;
  radius: number;
  to: JointKey;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => new THREE.CylinderGeometry(radius, radius, 1, 18), [radius]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pose = getPose(clock.elapsedTime, neutralRunnerParams);
    orientBetween(ref.current, pose[from], pose[to]);
  });

  return (
    <mesh
      castShadow
      geometry={geometry}
      material={material}
      ref={(mesh) => {
        if (!mesh) return;
        ref.current = mesh;
        mesh.userData.update = (pose: Pose) => orientBetween(mesh, pose[from], pose[to]);
      }}
      receiveShadow
    />
  );
}

function DynamicSphere({
  joint,
  material,
  radius,
  scale = [1, 1, 1],
}: {
  joint: JointKey;
  material: THREE.Material;
  radius: number;
  scale?: [number, number, number];
}) {
  const ref = useRef<THREE.Mesh>(null);
  return (
    <mesh
      castShadow
      material={material}
      ref={(mesh) => {
        if (!mesh) return;
        ref.current = mesh;
        mesh.userData.update = (pose: Pose) => {
          mesh.position.copy(pose[joint]);
        };
      }}
      receiveShadow
      scale={scale}
    >
      <sphereGeometry args={[radius, 24, 18]} />
    </mesh>
  );
}

function MuscleOverlay() {
  const muscleMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ff6d4d",
        emissive: "#ff3b1f",
        emissiveIntensity: 1,
        transparent: true,
        opacity: 0.76,
        roughness: 0.35,
      }),
    [],
  );
  return (
    <>
      <SignalMuscle joint="chest" material={muscleMaterial} signalKey="obliques" scale={[0.42, 0.2, 0.72]} offset={[0.04, -0.1, 0]} />
      <SignalMuscle joint="chest" material={muscleMaterial} signalKey="lats" scale={[0.24, 0.34, 0.88]} offset={[-0.08, 0.02, 0]} />
      <SignalMuscle joint="pelvis" material={muscleMaterial} signalKey="glutes" scale={[0.34, 0.2, 0.68]} offset={[-0.08, -0.02, 0]} />
      <SignalMuscle joint="pelvis" material={muscleMaterial} signalKey="hipRotators" scale={[0.42, 0.16, 0.82]} offset={[0.02, 0, 0]} />
      <SignalMuscle joint="chest" material={muscleMaterial} signalKey="spinalStabilizers" scale={[0.18, 0.46, 0.38]} offset={[-0.18, 0.04, 0]} />
      <SignalMuscle joint="leftAnkle" material={muscleMaterial} signalKey="calves" scale={[0.14, 0.26, 0.14]} offset={[0, 0.25, 0]} />
      <SignalMuscle joint="rightAnkle" material={muscleMaterial} signalKey="calves" scale={[0.14, 0.26, 0.14]} offset={[0, 0.25, 0]} />
      <SignalMuscle joint="leftKnee" material={muscleMaterial} signalKey="kneeLoad" scale={[0.16, 0.16, 0.16]} offset={[0, 0, 0]} />
      <SignalMuscle joint="rightKnee" material={muscleMaterial} signalKey="kneeLoad" scale={[0.16, 0.16, 0.16]} offset={[0, 0, 0]} />
    </>
  );
}

function SignalMuscle({
  joint,
  material,
  offset,
  scale,
  signalKey,
}: {
  joint: JointKey;
  material: THREE.MeshStandardMaterial;
  offset: [number, number, number];
  scale: [number, number, number];
  signalKey: keyof Omit<BiomechSignal, "gait">;
}) {
  return (
    <mesh
      material={material}
      ref={(mesh) => {
        if (!mesh) return;
        mesh.userData.update = (pose: Pose, signal: BiomechSignal) => {
          const intensity = Number(signal[signalKey]);
          mesh.position.copy(pose[joint]).add(new THREE.Vector3(...offset));
          mesh.scale.set(scale[0] * (0.42 + intensity), scale[1] * (0.42 + intensity), scale[2] * (0.42 + intensity));
          material.emissiveIntensity = 0.3 + intensity * 1.8;
          material.opacity = 0.25 + intensity * 0.64;
        };
      }}
    >
      <sphereGeometry args={[1, 24, 16]} />
    </mesh>
  );
}

function ForceOverlay() {
  const forceMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#f4c24f", emissive: "#f4c24f", emissiveIntensity: 1.3 }),
    [],
  );
  const alertMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ff4f70", emissive: "#ff4f70", emissiveIntensity: 1.2, transparent: true, opacity: 0.78 }),
    [],
  );

  return (
    <>
      <ForceArrow foot="leftAnkle" material={forceMaterial} />
      <ForceArrow foot="rightAnkle" material={forceMaterial} />
      <AlertRing joint="leftKnee" material={alertMaterial} signalKey="kneeLoad" />
      <AlertRing joint="rightKnee" material={alertMaterial} signalKey="kneeLoad" />
      <AlertRing joint="pelvis" material={alertMaterial} signalKey="pelvisDropAlert" />
      <OverstrideMarker material={alertMaterial} />
    </>
  );
}

function ForceArrow({ foot, material }: { foot: "leftAnkle" | "rightAnkle"; material: THREE.Material }) {
  return (
    <group
      ref={(group) => {
        if (!group) return;
        group.userData.update = (pose: Pose, signal: BiomechSignal) => {
          const active = pose[foot].y < 0.25 ? signal.landingForce : 0;
          group.visible = active > 0.05;
          group.position.copy(pose[foot]).setY(0.05);
          group.scale.set(0.08, 0.32 + active * 0.78, 0.08);
        };
      }}
    >
      <mesh material={material} position={[0, 0.5, 0]}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
      </mesh>
      <mesh material={material} position={[0, 1.08, 0]}>
        <coneGeometry args={[2.2, 3.2, 20]} />
      </mesh>
    </group>
  );
}

function AlertRing({
  joint,
  material,
  signalKey,
}: {
  joint: JointKey;
  material: THREE.MeshStandardMaterial;
  signalKey: "kneeLoad" | "pelvisDropAlert";
}) {
  return (
    <mesh
      material={material}
      ref={(mesh) => {
        if (!mesh) return;
        mesh.userData.update = (pose: Pose, signal: BiomechSignal) => {
          const intensity = signal[signalKey];
          mesh.visible = intensity > 0.14;
          mesh.position.copy(pose[joint]);
          mesh.scale.setScalar(0.15 + intensity * 0.24);
          material.opacity = 0.2 + intensity * 0.7;
        };
      }}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <torusGeometry args={[1, 0.08, 12, 38]} />
    </mesh>
  );
}

function OverstrideMarker({ material }: { material: THREE.Material }) {
  return (
    <mesh
      material={material}
      ref={(mesh) => {
        if (!mesh) return;
        mesh.userData.update = (pose: Pose, signal: BiomechSignal) => {
          const leadFoot = pose.leftAnkle.x > pose.rightAnkle.x ? pose.leftAnkle : pose.rightAnkle;
          mesh.visible = signal.overstrideAlert > 0.18;
          mesh.position.copy(leadFoot).add(new THREE.Vector3(0.12, 0.02, 0));
          mesh.scale.set(0.18 + signal.overstrideAlert * 0.2, 0.18 + signal.overstrideAlert * 0.2, 0.18 + signal.overstrideAlert * 0.2);
        };
      }}
    >
      <boxGeometry args={[1, 0.08, 1]} />
    </mesh>
  );
}

function RunnerLabel({ label }: { label: string }) {
  return (
    <group position={[0, 0.05, -0.62]}>
      <mesh>
        <boxGeometry args={[0.85, 0.035, 0.035]} />
        <meshStandardMaterial color={label === "reference" ? "#78d7ff" : "#f2b84b"} emissive={label === "reference" ? "#0d5270" : "#6e4200"} />
      </mesh>
    </group>
  );
}

function Ground() {
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
      <planeGeometry args={[8, 6]} />
      <meshStandardMaterial color="#10201d" roughness={0.85} />
    </mesh>
  );
}

function TrackLines() {
  const material = useMemo(
    () => new THREE.LineBasicMaterial({ color: "#2fc5a8", transparent: true, opacity: 0.32 }),
    [],
  );
  const lines = useMemo(
    () =>
      [-1.2, -0.4, 0.4, 1.2].map((z) => {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-3.8, 0.002, z),
          new THREE.Vector3(3.8, 0.002, z),
        ]);
        return { object: new THREE.Line(geometry, material), z };
      }),
    [material],
  );
  return (
    <group>
      {lines.map((line) => (
        <primitive key={line.z} object={line.object} />
      ))}
    </group>
  );
}

type Pose = Record<
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
  | "rightHand",
  THREE.Vector3
>;

function getPose(time: number, params: RunnerParams, motionClip?: MotionClip | null): Pose {
  if (motionClip) return getMotionPose(time, params, motionClip);

  const cycle = time * (params.cadence / 60) * params.pace * Math.PI;
  const stride = 0.38 + params.strideLength * 0.34;
  const bounce = 0.025 + params.verticalBounce * 0.08;
  const pelvisY = 1.06 + Math.abs(Math.sin(cycle * 2)) * bounce;
  const lean = -0.06 - params.trunkLean * 0.24;
  const pelvisYaw = Math.sin(cycle) * params.pelvisRotation * 0.12;
  const shoulderYaw = -Math.sin(cycle) * params.counterRotation * 0.18;
  const lateral = 0.14 + params.stepWidth * 0.18;
  const drop = Math.sin(cycle) * params.pelvisDrop * 0.08;

  const pelvis = new THREE.Vector3(0, pelvisY, 0);
  const chest = new THREE.Vector3(lean, pelvisY + 0.68, 0);
  const neck = new THREE.Vector3(lean - 0.03, pelvisY + 1.06, 0);
  const head = new THREE.Vector3(lean - 0.06, pelvisY + 1.22, 0);

  const leftPhase = cycle;
  const rightPhase = cycle + Math.PI;
  const leftHip = new THREE.Vector3(pelvisYaw, pelvisY - drop, lateral);
  const rightHip = new THREE.Vector3(-pelvisYaw, pelvisY + drop, -lateral);
  const leftAnkle = footPosition(leftPhase, stride, params, lateral);
  const rightAnkle = footPosition(rightPhase, stride, params, -lateral);
  const leftKnee = kneePosition(leftHip, leftAnkle, leftPhase, 0.24);
  const rightKnee = kneePosition(rightHip, rightAnkle, rightPhase, -0.24);

  const shoulderWidth = 0.28;
  const leftShoulder = new THREE.Vector3(chest.x + shoulderYaw, chest.y + 0.16, shoulderWidth);
  const rightShoulder = new THREE.Vector3(chest.x - shoulderYaw, chest.y + 0.16, -shoulderWidth);
  const armReach = 0.18 + params.armSwing * 0.32;
  const leftElbow = new THREE.Vector3(chest.x - Math.sin(cycle) * armReach, chest.y - 0.22, shoulderWidth * 1.05);
  const rightElbow = new THREE.Vector3(chest.x + Math.sin(cycle) * armReach, chest.y - 0.22, -shoulderWidth * 1.05);
  const leftHand = new THREE.Vector3(chest.x - Math.sin(cycle) * (armReach + 0.18), chest.y - 0.5, shoulderWidth * 0.9);
  const rightHand = new THREE.Vector3(chest.x + Math.sin(cycle) * (armReach + 0.18), chest.y - 0.5, -shoulderWidth * 0.9);

  return {
    pelvis,
    chest,
    neck,
    head,
    leftHip,
    rightHip,
    leftKnee,
    rightKnee,
    leftAnkle,
    rightAnkle,
    leftShoulder,
    rightShoulder,
    leftElbow,
    rightElbow,
    leftHand,
    rightHand,
  };
}

function getMotionPose(time: number, params: RunnerParams, motionClip: MotionClip): Pose {
  const frames = motionClip.frames;
  const frameSpeed = params.pace * (params.cadence / 176);
  const frameFloat = (time * motionClip.fps * frameSpeed) % frames.length;
  const frameIndex = Math.floor(frameFloat);
  const nextIndex = (frameIndex + 1) % frames.length;
  const amount = frameFloat - frameIndex;
  const rawPose = {} as Pose;

  for (const joint of motionClip.joints) {
    const a = frames[frameIndex].joints[joint];
    const b = frames[nextIndex].joints[joint];
    rawPose[joint] = new THREE.Vector3(
      THREE.MathUtils.lerp(a[0], b[0], amount),
      THREE.MathUtils.lerp(a[1], b[1], amount),
      THREE.MathUtils.lerp(a[2], b[2], amount),
    );
  }

  const pose = retargetMotionPose(rawPose, params);
  const leanOffset = (params.trunkLean - 0.52) * -0.22;
  const bounceOffset = (params.verticalBounce - 0.5) * 0.05 * Math.abs(Math.sin(frameFloat / frames.length * Math.PI * 2));
  const armScale = 0.78 + params.armSwing * 0.42;

  for (const joint of Object.keys(pose) as JointKey[]) {
    pose[joint].y += bounceOffset;
    if (["chest", "neck", "head", "leftShoulder", "rightShoulder"].includes(joint)) {
      pose[joint].x += leanOffset;
    }
  }

  scaleArm("leftShoulder", "leftElbow", armScale);
  scaleArm("leftShoulder", "leftHand", armScale);
  scaleArm("rightShoulder", "rightElbow", armScale);
  scaleArm("rightShoulder", "rightHand", armScale);

  return pose;

  function scaleArm(anchorKey: JointKey, targetKey: JointKey, scale: number) {
    const anchor = pose[anchorKey];
    const target = pose[targetKey];
    const delta = target.clone().sub(anchor);
    target.copy(anchor).add(delta.multiplyScalar(scale));
  }
}

function retargetMotionPose(raw: Pose, params: RunnerParams): Pose {
  const pose = {} as Pose;
  const hipWidth = 0.15 + params.stepWidth * 0.11;
  const shoulderWidth = 0.3;
  const thighLength = 0.5;
  const shankLength = 0.49;
  const upperArmLength = 0.34;
  const forearmLength = 0.31;
  const strideScale = 0.82 + params.strideLength * 0.22;
  const pelvisY = THREE.MathUtils.clamp(raw.pelvis.y, 0.96, 1.12);

  pose.pelvis = new THREE.Vector3(0, pelvisY, 0);

  const trunkDir = directionOr(raw.chest, raw.pelvis, new THREE.Vector3(-0.1, 1, 0));
  trunkDir.x = THREE.MathUtils.clamp(trunkDir.x, -0.26, 0.1);
  pose.chest = pose.pelvis.clone().add(trunkDir.normalize().multiplyScalar(0.64));
  pose.neck = pose.chest.clone().add(new THREE.Vector3(-0.03, 0.34, 0));
  pose.head = pose.neck.clone().add(new THREE.Vector3(-0.03, 0.18, 0));

  pose.leftHip = pose.pelvis.clone().add(new THREE.Vector3(0.01, -0.09, hipWidth));
  pose.rightHip = pose.pelvis.clone().add(new THREE.Vector3(0.01, -0.09, -hipWidth));
  pose.leftShoulder = pose.chest.clone().add(new THREE.Vector3(-0.01, 0.14, shoulderWidth));
  pose.rightShoulder = pose.chest.clone().add(new THREE.Vector3(-0.01, 0.14, -shoulderWidth));

  retargetLimb("leftHip", "leftKnee", "leftAnkle", thighLength, shankLength, strideScale);
  retargetLimb("rightHip", "rightKnee", "rightAnkle", thighLength, shankLength, strideScale);
  retargetArms();

  pose.leftAnkle.y = Math.max(0.07, pose.leftAnkle.y);
  pose.rightAnkle.y = Math.max(0.07, pose.rightAnkle.y);
  pose.leftKnee.y = Math.max(pose.leftAnkle.y + 0.16, pose.leftKnee.y);
  pose.rightKnee.y = Math.max(pose.rightAnkle.y + 0.16, pose.rightKnee.y);

  return pose;

  function retargetLimb(rootKey: JointKey, midKey: JointKey, endKey: JointKey, rootToMid: number, midToEnd: number, xScale: number) {
    const root = pose[rootKey];
    const rawRoot = raw[rootKey];
    const rawMid = raw[midKey];
    const rawEnd = raw[endKey];
    const midDir = directionOr(rawMid, rawRoot, new THREE.Vector3(0.15, -1, root.z >= 0 ? 0.05 : -0.05));
    const endDir = directionOr(rawEnd, rawMid, new THREE.Vector3(0.1, -1, root.z >= 0 ? -0.03 : 0.03));
    midDir.x *= xScale;
    endDir.x *= xScale;
    pose[midKey] = root.clone().add(midDir.normalize().multiplyScalar(rootToMid));
    pose[endKey] = pose[midKey].clone().add(endDir.normalize().multiplyScalar(midToEnd));
  }

  function retargetArms() {
    const legSwing = THREE.MathUtils.clamp((pose.leftAnkle.x - pose.rightAnkle.x) / 0.72, -1, 1);
    const swing = params.armSwing * 0.34;
    const elbowBend = 0.18;
    const elbowDrop = upperArmLength * 0.72;
    const handDrop = forearmLength * 0.78;

    pose.leftElbow = pose.leftShoulder.clone().add(new THREE.Vector3(-legSwing * swing - elbowBend, -elbowDrop, 0.14));
    pose.leftHand = pose.leftElbow.clone().add(new THREE.Vector3(-legSwing * swing * 0.62 + elbowBend * 0.45, -handDrop, 0.08));
    pose.rightElbow = pose.rightShoulder.clone().add(new THREE.Vector3(legSwing * swing - elbowBend, -elbowDrop, -0.14));
    pose.rightHand = pose.rightElbow.clone().add(new THREE.Vector3(legSwing * swing * 0.62 + elbowBend * 0.45, -handDrop, -0.08));
  }
}

function directionOr(to: THREE.Vector3, from: THREE.Vector3, fallback: THREE.Vector3) {
  const direction = to.clone().sub(from);
  return direction.lengthSq() > 0.0001 ? direction : fallback.clone();
}

function footPosition(phase: number, stride: number, params: RunnerParams, z: number) {
  const forward = Math.sin(phase) * stride;
  const lift = Math.max(0, Math.sin(phase + Math.PI * 0.08)) ** 1.5 * (0.22 + params.verticalBounce * 0.16);
  const landingPitch = footStrikeBias(params.footStrike) * 0.035;
  return new THREE.Vector3(forward, 0.08 + lift - landingPitch, z);
}

function kneePosition(hip: THREE.Vector3, ankle: THREE.Vector3, phase: number, zBias: number) {
  const midpoint = hip.clone().lerp(ankle, 0.52);
  const drive = Math.max(0, Math.sin(phase + Math.PI * 0.2));
  midpoint.y += 0.12 + drive * 0.22;
  midpoint.x += Math.sin(phase + Math.PI * 0.35) * 0.12;
  midpoint.z += zBias * 0.08;
  return midpoint;
}

function orientBetween(mesh: THREE.Object3D, start: THREE.Vector3, end: THREE.Vector3) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.scale.set(1, length, 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
}
