import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { computeBiomechSignal, footStrikeBias, neutralRunnerParams } from "../biomechanics";
import type { BiomechSignal, MotionClip, OpenSimSignalDataset, OverlayMode, RunnerParams, ViewMode } from "../types";

interface RunnerSceneProps {
  comparison: boolean;
  motionClip: MotionClip | null;
  openSimSignals: OpenSimSignalDataset | null;
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

export default function RunnerScene({
  comparison,
  motionClip,
  openSimSignals,
  overlay,
  params,
  referenceParams,
  viewMode,
}: RunnerSceneProps) {
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
            <RunnerFigure
              label="reference"
              motionClip={motionClip}
              openSimSignals={openSimSignals}
              overlay="muscle"
              params={referenceParams}
              side="reference"
            />
            <RunnerFigure
              label="current"
              motionClip={motionClip}
              openSimSignals={openSimSignals}
              overlay={overlay}
              params={params}
              side="current"
            />
          </>
        ) : (
          <RunnerFigure
            label="runner"
            motionClip={motionClip}
            openSimSignals={openSimSignals}
            overlay={overlay}
            params={params}
            side="single"
          />
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
  openSimSignals,
  overlay,
  params,
  side,
}: {
  label: string;
  motionClip: MotionClip | null;
  openSimSignals: OpenSimSignalDataset | null;
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
      <RunnerBody motionClip={motionClip} openSimSignals={openSimSignals} overlay={overlay} params={params} tint={tint} />
      <RunnerLabel label={label} />
    </group>
  );
}

function RunnerBody({
  motionClip,
  openSimSignals,
  overlay,
  params,
  tint,
}: {
  motionClip: MotionClip | null;
  openSimSignals: OpenSimSignalDataset | null;
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
    body.current.userData.signal = computeBiomechSignal(t, params, openSimSignals);
  });

  return (
    <group ref={body}>
      <AnimatedBodyContent
        force={force}
        motionClip={motionClip}
        muscle={muscle}
        openSimSignals={openSimSignals}
        params={params}
        skeleton={skeleton}
        tint={tint}
      />
    </group>
  );
}

function AnimatedBodyContent({
  force,
  motionClip,
  muscle,
  openSimSignals,
  params,
  skeleton,
  tint,
}: {
  force: boolean;
  motionClip: MotionClip | null;
  muscle: boolean;
  openSimSignals: OpenSimSignalDataset | null;
  params: RunnerParams;
  skeleton: boolean;
  tint: string;
}) {
  const root = useRef<THREE.Group>(null);
  const [limbMaterial, skinMaterial, skeletonMaterial] = useMemo(
    () => {
      const skinTexture = createSkinTexture();
      const boneTexture = createBoneTexture();
      return [
        new THREE.MeshStandardMaterial({ color: tint, map: skinTexture, roughness: 0.55, metalness: 0.05 }),
        new THREE.MeshStandardMaterial({
        color: "#d7f7ef",
        map: skinTexture,
        depthWrite: !skeleton,
        transparent: true,
        opacity: skeleton ? 0.16 : 0.82,
        roughness: 0.62,
      }),
        new THREE.MeshStandardMaterial({
          color: "#f2ead7",
          map: boneTexture,
          emissive: "#3d3425",
          emissiveIntensity: 0.18,
          roughness: 0.72,
        }),
      ];
    },
    [skeleton, tint],
  );

  useFrame(({ clock }) => {
    if (!root.current) return;
    const pose = getPose(clock.elapsedTime, params, motionClip);
    const signal = computeBiomechSignal(clock.elapsedTime, params, openSimSignals);
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
        openSimSignals={openSimSignals}
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
  openSimSignals,
  params,
  skeleton,
  skeletonMaterial,
  skinMaterial,
}: {
  force: boolean;
  limbMaterial: THREE.Material;
  motionClip: MotionClip | null;
  muscle: boolean;
  openSimSignals: OpenSimSignalDataset | null;
  params: RunnerParams;
  skeleton: boolean;
  skeletonMaterial: THREE.Material;
  skinMaterial: THREE.Material;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const pose = getPose(clock.elapsedTime, params, motionClip);
    const signal = computeBiomechSignal(clock.elapsedTime, params, openSimSignals);
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
          <RibCage material={skeletonMaterial} />
          <PelvisBone material={skeletonMaterial} />
          <DynamicBoneMass joint="head" material={skeletonMaterial} radius={0.13} scale={[0.82, 1.05, 0.9]} />
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
  const muscleTexture = useMemo(() => createMuscleFiberTexture(), []);

  return (
    <>
      <SignalMuscle
        joint="chest"
        signalKey="obliques"
        scale={[0.42, 0.2, 0.72]}
        offset={[0.04, -0.1, 0]}
        texture={muscleTexture}
      />
      <SignalMuscle
        color="#c94d34"
        joint="chest"
        signalKey="lats"
        scale={[0.24, 0.34, 0.88]}
        offset={[-0.08, 0.02, 0]}
        texture={muscleTexture}
      />
      <SignalMuscle
        color="#e65a42"
        joint="pelvis"
        signalKey="glutes"
        scale={[0.34, 0.2, 0.68]}
        offset={[-0.08, -0.02, 0]}
        texture={muscleTexture}
      />
      <SignalMuscle
        color="#e06249"
        joint="pelvis"
        signalKey="hipRotators"
        scale={[0.42, 0.16, 0.82]}
        offset={[0.02, 0, 0]}
        texture={muscleTexture}
      />
      <SignalMuscle
        color="#b63c31"
        joint="chest"
        signalKey="spinalStabilizers"
        scale={[0.18, 0.46, 0.38]}
        offset={[-0.18, 0.04, 0]}
        texture={muscleTexture}
      />
      <SignalLimbMuscle from="leftHip" signalKey="quads" texture={muscleTexture} to="leftKnee" offset={[0.06, 0, 0.02]} />
      <SignalLimbMuscle from="rightHip" signalKey="quads" texture={muscleTexture} to="rightKnee" offset={[0.06, 0, -0.02]} />
      <SignalLimbMuscle
        color="#b94636"
        from="leftHip"
        signalKey="hamstrings"
        texture={muscleTexture}
        to="leftKnee"
        offset={[-0.06, 0, 0.02]}
      />
      <SignalLimbMuscle
        color="#b94636"
        from="rightHip"
        signalKey="hamstrings"
        texture={muscleTexture}
        to="rightKnee"
        offset={[-0.06, 0, -0.02]}
      />
      <SignalLimbMuscle
        color="#f06f4f"
        from="pelvis"
        signalKey="hipFlexors"
        texture={muscleTexture}
        to="leftHip"
        offset={[0.08, -0.04, 0.04]}
        width={0.13}
      />
      <SignalLimbMuscle
        color="#f06f4f"
        from="pelvis"
        signalKey="hipFlexors"
        texture={muscleTexture}
        to="rightHip"
        offset={[0.08, -0.04, -0.04]}
        width={0.13}
      />
      <SignalLimbMuscle
        color="#d84e35"
        from="leftKnee"
        signalKey="calves"
        texture={muscleTexture}
        to="leftAnkle"
        offset={[-0.04, 0.02, 0.02]}
        width={0.12}
      />
      <SignalLimbMuscle
        color="#d84e35"
        from="rightKnee"
        signalKey="calves"
        texture={muscleTexture}
        to="rightAnkle"
        offset={[-0.04, 0.02, -0.02]}
        width={0.12}
      />
      <SignalLimbMuscle
        color="#ff8a60"
        from="leftKnee"
        signalKey="tibialisAnterior"
        texture={muscleTexture}
        to="leftAnkle"
        offset={[0.05, 0.02, 0.03]}
        width={0.08}
      />
      <SignalLimbMuscle
        color="#ff8a60"
        from="rightKnee"
        signalKey="tibialisAnterior"
        texture={muscleTexture}
        to="rightAnkle"
        offset={[0.05, 0.02, -0.03]}
        width={0.08}
      />
      <SignalMuscle joint="leftKnee" signalKey="kneeLoad" scale={[0.16, 0.16, 0.16]} offset={[0, 0, 0]} texture={muscleTexture} />
      <SignalMuscle joint="rightKnee" signalKey="kneeLoad" scale={[0.16, 0.16, 0.16]} offset={[0, 0, 0]} texture={muscleTexture} />
    </>
  );
}

function SignalMuscle({
  color = "#ff6d4d",
  joint,
  offset,
  scale,
  signalKey,
  texture,
}: {
  color?: string;
  joint: JointKey;
  offset: [number, number, number];
  scale: [number, number, number];
  signalKey: keyof Omit<BiomechSignal, "gait">;
  texture: THREE.Texture;
}) {
  const material = useMemo(() => createMuscleMaterial(texture, color), [color, texture]);

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

function SignalLimbMuscle({
  color = "#ff6d4d",
  from,
  offset,
  signalKey,
  texture,
  to,
  width = 0.1,
}: {
  color?: string;
  from: JointKey;
  offset: [number, number, number];
  signalKey: keyof Omit<BiomechSignal, "gait">;
  texture: THREE.Texture;
  to: JointKey;
  width?: number;
}) {
  const material = useMemo(() => createMuscleMaterial(texture, color), [color, texture]);

  return (
    <mesh
      material={material}
      ref={(mesh) => {
        if (!mesh) return;
        mesh.userData.update = (pose: Pose, signal: BiomechSignal) => {
          const intensity = Number(signal[signalKey]);
          const start = pose[from].clone().add(new THREE.Vector3(...offset));
          const end = pose[to].clone().add(new THREE.Vector3(...offset));
          orientBetween(mesh, start, end);
          const thickness = width * (0.58 + intensity * 0.72);
          mesh.scale.x = thickness;
          mesh.scale.z = thickness * 0.72;
          material.emissiveIntensity = 0.22 + intensity * 1.65;
          material.opacity = 0.3 + intensity * 0.62;
        };
      }}
    >
      <sphereGeometry args={[1, 24, 18]} />
    </mesh>
  );
}

function DynamicBoneMass({
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
  return (
    <mesh
      castShadow
      material={material}
      ref={(mesh) => {
        if (!mesh) return;
        mesh.userData.update = (pose: Pose) => {
          mesh.position.copy(pose[joint]);
        };
      }}
      receiveShadow
      scale={scale}
    >
      <sphereGeometry args={[radius, 32, 18]} />
    </mesh>
  );
}

function RibCage({ material }: { material: THREE.Material }) {
  return (
    <group
      ref={(group) => {
        if (!group) return;
        group.userData.update = (pose: Pose) => {
          group.position.copy(pose.chest).add(new THREE.Vector3(-0.02, -0.03, 0));
        };
      }}
    >
      {[0, 1, 2].map((index) => (
        <mesh key={index} material={material} rotation={[Math.PI / 2, 0, 0]} scale={[0.22 + index * 0.045, 0.09, 0.16 + index * 0.025]} position={[0, -index * 0.075, 0]}>
          <torusGeometry args={[1, 0.045, 10, 52]} />
        </mesh>
      ))}
      <mesh material={material} position={[0.04, -0.08, 0]} scale={[0.035, 0.3, 0.035]}>
        <sphereGeometry args={[1, 18, 12]} />
      </mesh>
    </group>
  );
}

function PelvisBone({ material }: { material: THREE.Material }) {
  return (
    <group
      ref={(group) => {
        if (!group) return;
        group.userData.update = (pose: Pose) => {
          group.position.copy(pose.pelvis).add(new THREE.Vector3(0.01, -0.08, 0));
        };
      }}
    >
      <mesh material={material} rotation={[Math.PI / 2, 0, 0]} scale={[0.18, 0.08, 0.24]}>
        <torusGeometry args={[1, 0.08, 12, 48]} />
      </mesh>
      <mesh material={material} position={[0.02, 0.02, 0]} scale={[0.16, 0.08, 0.28]}>
        <sphereGeometry args={[1, 24, 14]} />
      </mesh>
    </group>
  );
}

function createMuscleMaterial(texture: THREE.Texture, color: string) {
  const map = texture.clone();
  map.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    color,
    map,
    emissive: color,
    emissiveIntensity: 0.65,
    transparent: true,
    opacity: 0.72,
    roughness: 0.42,
    metalness: 0.02,
  });
}

function createMuscleFiberTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#5f1514");
  gradient.addColorStop(0.45, "#c9442f");
  gradient.addColorStop(1, "#ff9a66");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = -canvas.height; y < canvas.height * 2; y += 7) {
    ctx.strokeStyle = "rgba(255, 228, 196, 0.42)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(50, y + 18, 110, y - 20, canvas.width, y + 8);
    ctx.stroke();
  }

  for (let y = 2; y < canvas.height; y += 9) {
    ctx.strokeStyle = "rgba(61, 8, 7, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y + 14);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 1.2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createBoneTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  ctx.fillStyle = "#efe5cd";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 110; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 0.5 + Math.random() * 1.8;
    ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,245,0.35)" : "rgba(116,92,55,0.14)";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let y = 8; y < canvas.height; y += 18) {
    ctx.strokeStyle = "rgba(124, 98, 64, 0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(32, y + 8, 82, y - 8, canvas.width, y + 4);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.6, 1.6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSkinTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  const gradient = ctx.createRadialGradient(30, 24, 6, 48, 48, 74);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.42, "#cfeee6");
  gradient.addColorStop(1, "#7fb8a8");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 120; i += 1) {
    ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.09)" : "rgba(10,40,36,0.08)";
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.25, 1.25);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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
