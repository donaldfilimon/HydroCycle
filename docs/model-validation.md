# Model validation boundary

HydroCycle v1 is validated as a deterministic, bounded engineering model. The
checks below establish internal consistency and reference agreement; they do
not establish hardware-predictive accuracy.

## Reference checks

| Subject                            | Independent reference                           | HydroCycle check                                                                                                                                                       |
| ---------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dissolved H2 at 298.15 K and 1 bar | NIST Henry-law value `0.00078 mol/(kg*bar)`     | Fixture resolves approximately 1.57 mg H2/L and 0.189 kJ/L on the derived LHV basis                                                                                    |
| Water phase burden                 | NIST liquid/vapor formation-enthalpy difference | Fixture resolves approximately 2.44 MJ/kg before sensible heating and remains positive                                                                                 |
| Thermodynamic properties           | Direct `cantera.Solution("gri30.yaml")` calls   | Tests compare temperature- and composition-dependent sensible internal energy, enthalpy, heat capacity, and the HP-equilibrium adiabatic temperature                   |
| Motored compression/expansion      | Analytic polytropic identities                  | Pressure and temperature ratios and return state match the analytic fixture                                                                                            |
| Slider-crank geometry              | TDC/BDC volume identities                       | TDC equals clearance volume and both BDC endpoints equal clearance plus displacement                                                                                   |
| Energy accounting                  | Discrete first-law audit                        | Nominal reactive fixtures require a residual below 0.5%; larger residuals are surfaced                                                                                 |
| Uncertainty propagation            | Seeded Latin-hypercube stratification           | Identical schema/model/seed/settings produce identical results and intervals; derived scalar loading follows the full pressure/headspace/Henry/bubble dependency graph; measured decay ordinates retain and propagate their point uncertainties |

## Cantera engine-example comparison

The [Cantera illustrative internal-combustion example](https://cantera.org/stable/examples/python/reactors/ic_engine.html)
is a structural reference, not a calibration dataset.

| Concern              | Cantera example structure                          | HydroCycle v1 scope                                                                                                                       |
| -------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Cycle coordinate     | Time-driven crank/piston kinematics                | Explicit -180 to +180 degree crank-angle grid with slider-crank volume                                                                    |
| Thermodynamics       | Cantera phase/reactor properties                   | Cantera `gri30.yaml` sensible U/H/cv evaluated at each step as temperature and homogeneous composition change, plus HP-equilibrium checks |
| State histories      | Pressure, temperature, volume, work, heat, species | Pressure, temperature, volume, H2/O2/N2/H2O, liquid/vapor water, cumulative heat terms, and P-V work                                      |
| Combustion closure   | Kinetic reactor illustration                       | Transparent Wiebe heat-release closure, deliberately bounded and calibration-dependent                                                    |
| Wall heat            | Configured reactor heat-transfer behavior          | Documented Hohenberg-style correlation, exposed as a calibration target                                                                   |
| Open-system hardware | Inlet/outlet/injector-like illustrative elements   | None; HydroCycle evaluates a closed homogeneous single-zone trace only after its gate passes                                              |
| Spatial resolution   | Zero-dimensional                                   | Zero-dimensional; the UI explicitly says “Single-zone state — schematic, not CFD.”                                                        |

HydroCycle does not copy the example’s numeric inputs or claim its reactor
network as an engine prediction. The comparison establishes a familiar engine
loop organization while preserving HydroCycle’s tighter evidence gate,
explicit phase burden, and prohibition on hardware command surfaces.

## Golden scenarios

- Ambient dissolved-H2 reference: fails safely and retains the motored trace.
- Ambient-pressure literature range: remains comparison-only and fails safely.
- Upstream-vaporized carrier: exposes both hydrogen and preheat deficits.
- Separate hydrogen with water injection: treats H2 as fuel and water as load.
- Artificial pass: deliberately high, visibly synthetic input reaches the
  proposed 0D path and its energy-conservation audit.
- Out-of-domain state: reports `outside_model_domain` and suppresses reaction.
- Inconsistent retention/release: reports `mass_balance_failed`.
- Increasing measured decay series: reports `invalid_data`.

## Calibration stop rule

The model must not be called hardware-predictive until measured total-H2 and
pressure-trace data calibrate burn duration, wall heat transfer, water phase
behavior, and cycle losses. The thermal-NOx output remains a relative risk
indicator, never a numeric emissions claim. A future live-data adapter is
read-only; control, interlocks, and hardware-in-the-loop validation require a
separate authorized package and safety review.
