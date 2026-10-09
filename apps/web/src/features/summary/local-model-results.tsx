import snapshot from "../../../public/local-model-results.json";
import { useHydroCycle } from "../../state/app-state";
import "./local-model-results.css";

const equations = [
  [
    "Dissolved hydrogen",
    "C = kH · pH₂ · ρwater · MH₂ · 10⁶",
    "C in mg/L; kH = 0.00078 mol/(kg·bar) at 298.15 K. The solver's temperature correction exp[−0.015(T−298.15)] is an assumption.",
  ],
  [
    "Bubble inventory",
    "m = Σ N · (πd³/6) · (pambient + 4σ/d) · MH₂/(RT)",
    "SI units; N is the number per litre. Size and count alone do not establish gas identity. An authoritative total replaces the dissolved-plus-bubble estimate.",
  ],
  [
    "Retention at intake",
    "Cretained = Ctotal · exp(−kt) · (1 − fhandling) · fdelivery",
    "First-order storage retention is an assumption. A measured decay series replaces that closure when supplied; missing measurements remain null in the result record.",
  ],
  [
    "Available hydrogen",
    "mH₂,intake = Cretained · Vcarrier",
    "mg/cycle from mg/L × L/cycle. Retained and released hydrogen must close the mass ledger.",
  ],
  [
    "Required hydrogen",
    "mH₂,required = mair · φ/AFRstoich",
    "The target equivalence ratio φ sets the hydrogen mass requirement for trapped air. Oxygen availability independently caps the hydrogen credited as chemical energy.",
  ],
  [
    "Chemical energy",
    "QH₂ = min(mavailable, mrequired, moxygen-limit) · LHVH₂",
    "Convert mg to kg before multiplying by J/kg. Hydrogen is the fuel; water contributes no chemical energy.",
  ],
  [
    "Water thermal burden",
    "Qwater = mwater · cp · max(Tboil − Tin, 0) + mwater · Δhvap",
    "The current 0D gate uses a 298 K reference phase burden. Net burden is max(Qwater − Qrecovered, 0).",
  ],
  [
    "Feasibility margin",
    "ΔE = QH₂ − Qwall − Wtarget − Qwater,net",
    "Wtarget = target IMEP × displacement in SI units. A negative margin suppresses the proposed reactive cycle.",
  ],
  [
    "Cylinder volume",
    "V(θ) = Vc + A[r(1 − cos θ) + l − √(l² − r²sin² θ)]",
    "r = stroke/2, A = displacement/stroke, Vc = displacement/(compression ratio − 1). TDC is θ = 0.",
  ],
  [
    "Motored baseline",
    "pVᵞ = constant; TVᵞ⁻¹ = constant; W = ∮ p dV",
    "Closed compression/expansion reference. Its numerical work near zero does not demonstrate fuel-generated work.",
  ],
] as const;

const format = (value: number, digits = 4) =>
  value.toLocaleString("en-US", { maximumFractionDigits: digits });

export function LocalModelResults() {
  const { runtime } = useHydroCycle();
  return (
    <section className="local-results" aria-labelledby="local-results-title">
      <header className="route-heading">
        <div>
          <h2 id="local-results-title">LOCAL MATH & RESULTS</h2>
          <span>Reference calculations · {snapshot.recorded_date}</span>
        </div>
        <code>{snapshot.status}</code>
      </header>
      <p>
        These fixed reference cases were computed by the local Python model.
        They are independent of the interactive public fixture above. Both cases
        fail the feasibility gate; neither demonstrates a working engine or
        measured performance.
      </p>
      <div className="local-results-grid">
        {snapshot.cases.map(({ name, basis, result }) => {
          const gate = result.gate;
          const energy = gate.energy_terms;
          const rows = [
            [
              "Total hydrogen loading",
              result.loading.total_h2_mg_l.value,
              "mg/L",
              4,
            ],
            [
              "Hydrogen available",
              gate.hydrogen_available.value,
              "mg/cycle",
              8,
            ],
            ["Hydrogen required", gate.hydrogen_required.value, "mg/cycle", 5],
            [
              "Hydrogen chemical energy",
              energy.hydrogen_chemical_energy_j,
              "J/cycle",
              6,
            ],
            [
              "Water sensible heating",
              energy.water_sensible_heating_j,
              "J/cycle",
              3,
            ],
            [
              "Water phase-change load",
              energy.water_phase_change_j,
              "J/cycle",
              3,
            ],
            ["Recovered heat", energy.heat_recovery_j, "J/cycle", 3],
            ["Estimated wall loss", energy.estimated_wall_loss_j, "J/cycle", 6],
            [
              "Target indicated work",
              energy.target_indicated_work_j,
              "J/cycle",
              3,
            ],
            ["Net energy margin", energy.usable_energy_margin_j, "J/cycle", 3],
          ] as const;
          return (
            <article key={name}>
              <h3>{name}</h3>
              <p>{basis}</p>
              <strong>GATE FAILED · motored baseline only</strong>
              <table>
                <caption className="sr-only">
                  {name} mass and energy ledger
                </caption>
                <thead>
                  <tr>
                    <th>Calculated term</th>
                    <th>Value</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([label, amount, unit, digits]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td>{format(amount, digits)}</td>
                      <td>{unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>
                Failures: {gate.failures.join(", ")}. Relative hydrogen mass
                residual: {gate.mass_balance.relative_residual.toExponential(3)}
                . Proposed reactive cycle: unavailable.
              </p>
              <details>
                <summary>Reproducibility and uncertainty</summary>
                <p>
                  Result ID: <code>{result.result_id}</code>
                </p>
                <p>
                  Available H₂ standard uncertainty:{" "}
                  {format(gate.hydrogen_available.standard_uncertainty, 8)}{" "}
                  mg/cycle. Required H₂ standard uncertainty:{" "}
                  {format(gate.hydrogen_required.standard_uncertainty, 6)}{" "}
                  mg/cycle. These are standard uncertainties, not confidence
                  intervals.
                </p>
                <p>
                  Solver {result.reproducibility.solver_version}; Python{" "}
                  {result.reproducibility.python_version}; Cantera{" "}
                  {result.reproducibility.cantera_version}; mechanism{" "}
                  {result.reproducibility.mechanism}; seed{" "}
                  {result.reproducibility.random_seed};{" "}
                  {result.reproducibility.analytical_samples} analytical samples
                  and {result.reproducibility.cycle_samples} cycle samples.
                </p>
              </details>
            </article>
          );
        })}
      </div>
      <details className="local-equations">
        <summary>Inspect the governing equations</summary>
        {equations.map(([name, equation, note]) => (
          <article key={name}>
            <h3>{name}</h3>
            <code>{equation}</code>
            <p>{note}</p>
          </article>
        ))}
        <p>
          The P1 foundation uses absolute formation-plus-sensible enthalpies for
          stage balances: Hin + Hadded + Ein = Hout + Hside + Wout + Qambient.
          That foundation is a separate concept contract; these snapshots come
          from the current hydrocycle-0d-1 solver.
        </p>
      </details>
      <p>
        Validation covers reference agreement, geometry, conservation and seeded
        repeatability. Hardware prediction still requires measured total H₂,
        pressure traces and calibration of combustion duration, wall heat
        transfer, phase behavior and cycle losses. The model is homogeneous and
        single-zone; schematic geometry and particle proxies provide no CFD
        evidence.
      </p>
      <p>
        Source revision: <code>{snapshot.source_commit}</code>.{" "}
        {snapshot.source_state}.
      </p>
      <a
        className="local-results-download"
        href={`${runtime.basePath}/local-model-results.json`}
        download
      >
        Download inputs, results, source ledger and solver metadata (JSON)
      </a>
    </section>
  );
}
