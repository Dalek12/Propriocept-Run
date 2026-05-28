import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BadgeInfo,
  Bone,
  Camera,
  Database,
  Footprints,
  Gauge,
  GitCompare,
  Layers,
  Rotate3D,
  Sparkles,
} from "lucide-react";
import { computeBiomechSignal, neutralRunnerParams } from "./biomechanics";
import RunnerScene from "./components/RunnerScene";
import { runnerPresets } from "./presets";
import type { FootStrike, MotionClip, MotionSource, OverlayMode, RunnerParams, ViewMode } from "./types";

const overlayOptions: Array<{ id: OverlayMode; label: string; icon: typeof Layers }> = [
  { id: "skin", label: "Body", icon: Layers },
  { id: "skeleton", label: "Skeleton", icon: Bone },
  { id: "muscle", label: "Muscles", icon: Activity },
  { id: "force", label: "Forces", icon: Sparkles },
  { id: "comparison", label: "Compare", icon: GitCompare },
];

const viewOptions: Array<{ id: ViewMode; label: string }> = [
  { id: "side", label: "Side" },
  { id: "front", label: "Front" },
  { id: "threeQuarter", label: "3/4" },
  { id: "top", label: "Top" },
];

function App() {
  const [currentPreset, setCurrentPreset] = useState("efficient");
  const [params, setParams] = useState<RunnerParams>(neutralRunnerParams);
  const [referenceParams] = useState<RunnerParams>(neutralRunnerParams);
  const [overlay, setOverlay] = useState<OverlayMode>("muscle");
  const [viewMode, setViewMode] = useState<ViewMode>("side");
  const [motionClip, setMotionClip] = useState<MotionClip | null>(null);
  const [motionSource, setMotionSource] = useState<MotionSource>("cmu");

  useEffect(() => {
    let cancelled = false;
    fetch("/mocap/cmu/09_01_run.motion.json")
      .then((response) => {
        if (!response.ok) throw new Error(`Motion clip failed to load: ${response.status}`);
        return response.json() as Promise<MotionClip>;
      })
      .then((clip) => {
        if (!cancelled) setMotionClip(clip);
      })
      .catch(() => {
        if (!cancelled) setMotionSource("procedural");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const previewSignal = useMemo(() => computeBiomechSignal(0.18, params), [params]);
  const compareEnabled = overlay === "comparison";
  const activeMotionClip = motionSource === "cmu" ? motionClip : null;

  const updateParam = <K extends keyof RunnerParams>(key: K, value: RunnerParams[K]) => {
    setParams((next) => ({ ...next, [key]: value }));
    setCurrentPreset("custom");
  };

  const applyPreset = (presetId: string) => {
    const preset = runnerPresets.find((item) => item.id === presetId);
    if (!preset) return;
    setCurrentPreset(preset.id);
    setParams(preset.params);
    if (preset.id !== "efficient") setOverlay("comparison");
  };

  return (
    <main className="app-shell">
      <section className="stage" aria-label="AnybodyRun prototype stage">
        <div className="brand-strip">
          <div>
            <span className="eyebrow">AnybodyRun prototype</span>
            <h1>Visual running-form mirror</h1>
          </div>
          <div className="status-cluster" aria-label="Current biomechanical highlights">
            <SignalPill label="Counter-rotation" value={previewSignal.obliques} />
            <SignalPill label="Landing force" value={previewSignal.landingForce} />
            <SignalPill label="Knee load" value={previewSignal.kneeLoad} />
          </div>
        </div>

        <RunnerScene
          motionClip={activeMotionClip}
          overlay={overlay}
          params={params}
          referenceParams={referenceParams}
          viewMode={viewMode}
          comparison={compareEnabled}
        />

        <div className="stage-footer">
          <div>
            <strong>{compareEnabled ? "Reference vs current pattern" : "Reference runner"}</strong>
            <span>
              {compareEnabled
                ? "Left runner stays efficient; right runner follows the controls."
                : activeMotionClip
                  ? `${activeMotionClip.label}: ${activeMotionClip.frameCount} frames at ${activeMotionClip.fps} fps.`
                  : "The figure is fully parameter-driven and ready for later camera input."}
            </span>
          </div>
          <div className="phase-readout">
            <Footprints size={16} />
            <span>{previewSignal.gait.name}</span>
          </div>
        </div>
      </section>

      <aside className="control-panel" aria-label="Runner controls">
        <div className="panel-section">
          <div className="section-heading">
            <Gauge size={17} />
            <h2>Teaching presets</h2>
          </div>
          <div className="preset-grid">
            {runnerPresets.map((preset) => (
              <button
                className={currentPreset === preset.id ? "preset-button active" : "preset-button"}
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                type="button"
                title={preset.description}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <div className="section-heading">
            <Database size={17} />
            <h2>Motion source</h2>
          </div>
          <div className="view-row">
            <button
              aria-pressed={motionSource === "cmu"}
              className={motionSource === "cmu" ? "view-button active" : "view-button"}
              disabled={!motionClip}
              onClick={() => setMotionSource("cmu")}
              type="button"
            >
              CMU mocap
            </button>
            <button
              aria-pressed={motionSource === "procedural"}
              className={motionSource === "procedural" ? "view-button active" : "view-button"}
              onClick={() => setMotionSource("procedural")}
              type="button"
            >
              Procedural
            </button>
          </div>
        </div>

        <div className="panel-section">
          <div className="section-heading">
            <Layers size={17} />
            <h2>Overlays</h2>
          </div>
          <div className="segmented">
            {overlayOptions.map(({ id, label, icon: Icon }) => (
              <button
                aria-pressed={overlay === id}
                className={overlay === id ? "segment active" : "segment"}
                key={id}
                onClick={() => setOverlay(id)}
                title={label}
                type="button"
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <div className="section-heading">
            <Camera size={17} />
            <h2>View</h2>
          </div>
          <div className="view-row">
            {viewOptions.map((view) => (
              <button
                aria-pressed={viewMode === view.id}
                className={viewMode === view.id ? "view-button active" : "view-button"}
                key={view.id}
                onClick={() => setViewMode(view.id)}
                type="button"
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel-section control-stack">
          <div className="section-heading">
            <Rotate3D size={17} />
            <h2>Runner parameters</h2>
          </div>
          <Slider label="Pace" min={0.55} max={1.45} step={0.01} value={params.pace} onChange={(value) => updateParam("pace", value)} />
          <Slider label="Cadence" min={140} max={196} step={1} suffix=" spm" value={params.cadence} onChange={(value) => updateParam("cadence", value)} />
          <Slider label="Stride length" min={0.72} max={1.38} step={0.01} value={params.strideLength} onChange={(value) => updateParam("strideLength", value)} />
          <Slider label="Vertical bounce" min={0} max={1} step={0.01} value={params.verticalBounce} onChange={(value) => updateParam("verticalBounce", value)} />
          <Slider label="Trunk lean" min={0} max={1} step={0.01} value={params.trunkLean} onChange={(value) => updateParam("trunkLean", value)} />
          <Slider label="Arm swing" min={0} max={1} step={0.01} value={params.armSwing} onChange={(value) => updateParam("armSwing", value)} />
          <Slider label="Pelvis rotation" min={0} max={1} step={0.01} value={params.pelvisRotation} onChange={(value) => updateParam("pelvisRotation", value)} />
          <Slider label="Counter-rotation" min={0} max={1} step={0.01} value={params.counterRotation} onChange={(value) => updateParam("counterRotation", value)} />
          <Slider label="Pelvis drop" min={0} max={1} step={0.01} value={params.pelvisDrop} onChange={(value) => updateParam("pelvisDrop", value)} />
          <Slider label="Step width" min={0.1} max={0.8} step={0.01} value={params.stepWidth} onChange={(value) => updateParam("stepWidth", value)} />
        </div>

        <div className="panel-section">
          <div className="section-heading">
            <Footprints size={17} />
            <h2>Foot strike</h2>
          </div>
          <div className="view-row">
            {(["heel", "midfoot", "forefoot"] as FootStrike[]).map((strike) => (
              <button
                aria-pressed={params.footStrike === strike}
                className={params.footStrike === strike ? "view-button active" : "view-button"}
                key={strike}
                onClick={() => updateParam("footStrike", strike)}
                type="button"
              >
                {strike}
              </button>
            ))}
          </div>
        </div>

        <div className="disclaimer">
          <BadgeInfo size={16} />
          <p>Prototype visualization only. It does not diagnose injuries or replace clinical assessment.</p>
        </div>
      </aside>
    </main>
  );
}

function Slider({
  label,
  max,
  min,
  onChange,
  step,
  suffix = "",
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  suffix?: string;
  value: number;
}) {
  return (
    <label className="slider-row">
      <span>
        {label}
        <strong>{value.toFixed(step >= 1 ? 0 : 2)}{suffix}</strong>
      </span>
      <input
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </label>
  );
}

function SignalPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="signal-pill">
      <span>{label}</span>
      <meter max={1} min={0} value={value} />
    </div>
  );
}

export default App;
