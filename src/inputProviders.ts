import type { RunnerInputProvider, RunnerParams } from "./types";

export class ManualInputProvider implements RunnerInputProvider {
  kind = "manual" as const;
  label = "Manual controls";

  constructor(private params: RunnerParams) {}

  getParams() {
    return this.params;
  }
}

export class CameraPoseProvider implements RunnerInputProvider {
  kind = "cameraPose" as const;
  label = "Future camera pose";

  getParams(): RunnerParams {
    throw new Error("Camera pose input is reserved for a later prototype phase.");
  }
}

export class WearableSensorProvider implements RunnerInputProvider {
  kind = "wearableSensor" as const;
  label = "Future wearable sensor";

  getParams(): RunnerParams {
    throw new Error("Wearable sensor input is reserved for a later prototype phase.");
  }
}
