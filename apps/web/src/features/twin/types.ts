export interface TwinManifest {
  schema_version: string;
  geometry: {
    bore_mm: number;
    stroke_mm: number;
    crank_radius_mm: number;
    connecting_rod_mm: number;
    displacement_l: number;
    nominal_displacement_l: number;
    compression_ratio: number;
  };
  frames: {
    angle_deg: number;
    volume_cc: number;
    piston_travel_mm: number;
    crank_pin_mm: number[];
    piston_pin_mm: number[];
    rod_center_mm: number[];
    rod_angle_rad: number;
  }[];
  stages: {
    id: string;
    label: string;
    kind: string;
    position: number[];
    envelope: number[];
    description: string;
    evidence: string;
    unknowns: string[];
  }[];
  variants: {
    id: string;
    label: string;
    description: string;
    stage_ids: string[];
    connections: string[][];
  }[];
  ledger: {
    hydrogen_mg: Record<string, number | null>;
    energy_j: Record<string, number | null>;
    balance_status: string;
  };
  reference_comparison: {
    angle_deg: number;
    slider_crank_cc: number;
    legacy_harmonic_cc: number;
    difference_percent: number;
    explanation: string;
  };
  assumptions: string[];
  limitations: string[];
}
export interface RenderOptions {
  focus_stage?: string;
  frame_index: number;
  variant: string;
  visible_stages: string[];
  section: boolean;
  explode: number;
  yaw: number;
  pitch: number;
  distance: number;
  pan_x: number;
  pan_y: number;
}
export interface TwinRenderer {
  configure(options: string): void;
  resize(width: number, height: number): void;
  render(): void;
  free(): void;
}
export interface TwinModule {
  default: () => Promise<unknown>;
  TwinRenderer: {
    create(canvas: HTMLCanvasElement, manifest: string): Promise<TwinRenderer>;
  };
}
