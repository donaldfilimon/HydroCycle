/** Canonical units accepted at the versioned API boundary. */
export const CANONICAL_UNITS = [
  "1",
  "1/mL",
  "1/s",
  "bar",
  "deg",
  "J/cycle",
  "K",
  "kJ/L",
  "L",
  "mg/cycle",
  "mg/L",
  "mL/cycle",
  "mm",
  "N/m",
  "nm",
  "Pa",
  "rpm",
  "s",
] as const;

export type CanonicalUnit = (typeof CANONICAL_UNITS)[number];

export interface UnitDefinition {
  readonly symbol: CanonicalUnit;
  readonly quantity: string;
  readonly siScale: number;
  readonly siOffset: number;
  readonly siUnit: string;
}

/**
 * Conversion metadata for storage and import validation.
 *
 * `siValue = value * siScale + siOffset`. Dimensionless and API-specific
 * per-cycle units retain scale one because conversion depends on cycle
 * context rather than a standalone scalar conversion.
 */
export const UNIT_DEFINITIONS: Readonly<Record<CanonicalUnit, UnitDefinition>> =
  {
    "1": {
      symbol: "1",
      quantity: "fraction",
      siScale: 1,
      siOffset: 0,
      siUnit: "1",
    },
    "1/mL": {
      symbol: "1/mL",
      quantity: "number density",
      siScale: 1e6,
      siOffset: 0,
      siUnit: "1/m3",
    },
    "1/s": {
      symbol: "1/s",
      quantity: "rate constant",
      siScale: 1,
      siOffset: 0,
      siUnit: "1/s",
    },
    bar: {
      symbol: "bar",
      quantity: "pressure",
      siScale: 1e5,
      siOffset: 0,
      siUnit: "Pa",
    },
    deg: {
      symbol: "deg",
      quantity: "crank angle",
      siScale: Math.PI / 180,
      siOffset: 0,
      siUnit: "rad",
    },
    "J/cycle": {
      symbol: "J/cycle",
      quantity: "energy per engine cycle",
      siScale: 1,
      siOffset: 0,
      siUnit: "J/cycle",
    },
    K: {
      symbol: "K",
      quantity: "temperature",
      siScale: 1,
      siOffset: 0,
      siUnit: "K",
    },
    "kJ/L": {
      symbol: "kJ/L",
      quantity: "volumetric energy density",
      siScale: 1e6,
      siOffset: 0,
      siUnit: "J/m3",
    },
    L: {
      symbol: "L",
      quantity: "volume",
      siScale: 1e-3,
      siOffset: 0,
      siUnit: "m3",
    },
    "mg/cycle": {
      symbol: "mg/cycle",
      quantity: "mass per engine cycle",
      siScale: 1e-6,
      siOffset: 0,
      siUnit: "kg/cycle",
    },
    "mg/L": {
      symbol: "mg/L",
      quantity: "mass concentration",
      siScale: 1e-3,
      siOffset: 0,
      siUnit: "kg/m3",
    },
    "mL/cycle": {
      symbol: "mL/cycle",
      quantity: "volume per engine cycle",
      siScale: 1e-6,
      siOffset: 0,
      siUnit: "m3/cycle",
    },
    mm: {
      symbol: "mm",
      quantity: "length",
      siScale: 1e-3,
      siOffset: 0,
      siUnit: "m",
    },
    "N/m": {
      symbol: "N/m",
      quantity: "surface tension",
      siScale: 1,
      siOffset: 0,
      siUnit: "N/m",
    },
    nm: {
      symbol: "nm",
      quantity: "length",
      siScale: 1e-9,
      siOffset: 0,
      siUnit: "m",
    },
    Pa: {
      symbol: "Pa",
      quantity: "pressure",
      siScale: 1,
      siOffset: 0,
      siUnit: "Pa",
    },
    rpm: {
      symbol: "rpm",
      quantity: "rotational speed",
      siScale: (2 * Math.PI) / 60,
      siOffset: 0,
      siUnit: "rad/s",
    },
    s: { symbol: "s", quantity: "time", siScale: 1, siOffset: 0, siUnit: "s" },
  };
