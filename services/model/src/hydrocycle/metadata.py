"""Scientific provenance and runtime identity for HydroCycle results."""

from __future__ import annotations

import hashlib
import importlib.metadata
import platform
from pathlib import Path
from typing import Any

import numpy as np
import scipy

from .schemas import (
    SCHEMA_VERSION,
    EvidenceRecord,
    EvidenceRecordBasis,
    ModelMetadata,
    ReproducibilityMetadata,
)

MODEL_VERSION = "0.1.0"
SOLVER_VERSION = "hydrocycle-0d-1"
MECHANISM_NAME = "gri30.yaml"


def _cantera_runtime() -> tuple[Any | None, str | None]:
    try:
        import cantera as ct

        return ct, str(ct.__version__)
    except Exception:
        try:
            return None, importlib.metadata.version("cantera")
        except importlib.metadata.PackageNotFoundError:
            return None, None


def _mechanism_path(cantera_module: Any | None) -> Path | None:
    if cantera_module is None:
        return None
    try:
        for directory in cantera_module.get_data_directories():
            candidate = Path(directory) / MECHANISM_NAME
            if candidate.is_file():
                return candidate
    except Exception:
        return None
    return None


def mechanism_sha256() -> str | None:
    cantera_module, _ = _cantera_runtime()
    path = _mechanism_path(cantera_module)
    if path is None:
        return None
    try:
        return hashlib.sha256(path.read_bytes()).hexdigest()
    except OSError:
        return None


def source_ledger() -> list[EvidenceRecord]:
    """Return the evidence and implementation references used by v1."""

    return [
        EvidenceRecord(
            id="nist-h2-henry-298",
            basis=EvidenceRecordBasis.LITERATURE,
            title="Hydrogen Henry-law constant at 298.15 K",
            author_or_publisher="NIST Chemistry WebBook",
            publication_date=None,
            url="https://webbook.nist.gov/cgi/cbook.cgi?Mask=877&Source=1970TAK5793&Units=SI",
            method="Reference solubility constant",
            value_or_range="0.00078",
            unit="mol/(kg*bar)",
            uncertainty="Source table does not provide a v1 model-ready standard uncertainty",
            applicability_note=(
                "Reference point only. Temperature correction away from 298.15 K is an "
                "explicit model assumption and is not a new NIST measurement."
            ),
        ),
        EvidenceRecord(
            id="nist-h2-lhv-from-water-vapor",
            basis=EvidenceRecordBasis.LITERATURE,
            title="Hydrogen lower heating value derived from water-vapor formation enthalpy",
            author_or_publisher="NIST Chemistry WebBook",
            publication_date=None,
            url="https://webbook.nist.gov/cgi/cbook.cgi?Name=water&cTG=on",
            method="Absolute molar formation enthalpy divided by hydrogen molar mass",
            value_or_range="approximately 120",
            unit="MJ/kg H2",
            uncertainty="Rounded thermochemical reference",
            applicability_note="Hydrogen is the sole chemical-energy source in HydroCycle.",
        ),
        EvidenceRecord(
            id="nist-water-phase-burden",
            basis=EvidenceRecordBasis.LITERATURE,
            title="Liquid-to-vapor water enthalpy burden at 298.15 K",
            author_or_publisher="NIST Chemistry WebBook",
            publication_date=None,
            url="https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185&Mask=27AE",
            method="Difference between liquid- and vapor-water formation enthalpies",
            value_or_range="approximately 2.44",
            unit="MJ/kg water",
            uncertainty="Rounded thermochemical reference; sensible heating is separate",
            applicability_note=(
                "Charged as upstream energy for the vaporized-carrier scenario and as an "
                "in-cylinder phase-change load for the water-injection scenario."
            ),
        ),
        EvidenceRecord(
            id="nanobubble-measurement-limitation",
            basis=EvidenceRecordBasis.LITERATURE,
            title="Nanobubble characterization limitations",
            author_or_publisher="Peer-reviewed open literature",
            publication_date="2019",
            url="https://pmc.ncbi.nlm.nih.gov/articles/PMC6350620/",
            method="Review of orthogonal nanobubble characterization",
            value_or_range="bubble sizing alone is not gas-identity evidence",
            unit="qualitative",
            uncertainty="Method-dependent",
            applicability_note=(
                "Bubble-bin mass is diagnostic and explicitly uncertain. Measured total H2 "
                "always replaces, rather than adds to, the derived total."
            ),
        ),
        EvidenceRecord(
            id="ambient-h2-water-comparison-range",
            basis=EvidenceRecordBasis.LITERATURE,
            title="Ambient-pressure hydrogen-rich and nanobubble-water comparison range",
            author_or_publisher="International Journal of Hydrogen Energy",
            publication_date="2024",
            url="https://www.sciencedirect.com/science/article/pii/S0304389424016145",
            method="Freshly prepared total-hydrogen measurement reported by the study",
            value_or_range="1.6 to 2.2",
            unit="mg/L H2",
            uncertainty="Comparison range only; preparation and measurement method dependent",
            applicability_note=(
                "Used only as a literature preset. It is never labeled as Donald's or an "
                "operator's measured result and does not establish useful bulk energy density."
            ),
        ),
        EvidenceRecord(
            id="electrolyzed-water-h2-retention",
            basis=EvidenceRecordBasis.LITERATURE,
            title="Dissolved hydrogen in electrolyzed water",
            author_or_publisher="Journal of Colloid and Interface Science",
            publication_date="2006",
            url="https://www.sciencedirect.com/science/article/abs/pii/S0021979706000154",
            method="Electrolyzed-water hydrogen measurement and retention comparison",
            value_or_range="supports literature comparison, not a universal concentration",
            unit="qualitative",
            uncertainty="Preparation- and handling-dependent",
            applicability_note="Supports the retention context; it is not an engine-energy claim.",
        ),
        EvidenceRecord(
            id="headspace-gc-total-h2",
            basis=EvidenceRecordBasis.LITERATURE,
            title="Headspace gas chromatography for total dissolved hydrogen",
            author_or_publisher="Journal of Instrumental Analysis",
            publication_date="2024",
            url="https://hjgcjsxb.org.cn/en/article/Y2024/I4/1105",
            method="Headspace gas chromatography",
            value_or_range="method reference",
            unit="qualitative",
            uncertainty="Instrument calibration and sample-transfer dependent",
            applicability_note=(
                "Preferred class of orthogonal total-H2 mass measurement; bubble sizing "
                "remains supporting data."
            ),
        ),
        EvidenceRecord(
            id="hydrogen-engine-direct-water-injection-2026",
            basis=EvidenceRecordBasis.LITERATURE,
            title="Direct water injection in a hydrogen internal-combustion engine",
            author_or_publisher="International Journal of Engine Research",
            publication_date="2026",
            url="https://journals.sagepub.com/doi/abs/10.1177/14680874261440837",
            method="Hydrogen-engine experiment with direct water injection",
            value_or_range="charge cooling and combustion-management evidence",
            unit="qualitative",
            uncertainty="Engine- and operating-point dependent",
            applicability_note="Water is charge diluent/coolant; hydrogen remains the fuel.",
        ),
        EvidenceRecord(
            id="hydrogen-engine-water-injection-2023",
            basis=EvidenceRecordBasis.LITERATURE,
            title="Water injection effects in a hydrogen-fueled engine",
            author_or_publisher="Fuel",
            publication_date="2023",
            url="https://www.sciencedirect.com/science/article/pii/S0016236122034767",
            method="Hydrogen-engine water-injection experiment",
            value_or_range="NOx and load-management evidence",
            unit="qualitative",
            uncertainty="Engine- and operating-point dependent",
            applicability_note="Does not establish water as a net chemical-energy source.",
        ),
        EvidenceRecord(
            id="cantera-python-314-compatibility",
            basis=EvidenceRecordBasis.LITERATURE,
            title="Cantera Python installation compatibility",
            author_or_publisher="Cantera project documentation",
            publication_date=None,
            url="https://cantera.org/stable/install/pip.html",
            method="Official binary-package and supported-Python documentation",
            value_or_range="Cantera 3.2 with Python 3.14",
            unit="runtime compatibility",
            uncertainty="Runtime identity is recorded separately by every result",
            applicability_note=(
                "Implementation compatibility reference only. The health endpoint and every "
                "saved result report the actually installed version and mechanism hash."
            ),
        ),
        EvidenceRecord(
            id="cantera-illustrative-ic-engine-example",
            basis=EvidenceRecordBasis.LITERATURE,
            title="Cantera illustrative internal-combustion engine example",
            author_or_publisher="Cantera project documentation",
            publication_date=None,
            url="https://cantera.org/stable/examples/python/reactors/ic_engine.html",
            method="Illustrative zero-dimensional engine/reactor example",
            value_or_range="structural validation reference",
            unit="qualitative",
            uncertainty="Not an experimental calibration dataset",
            applicability_note=(
                "Used to compare crank-driven volume, state, heat, work, and species-history "
                "structure. HydroCycle remains a bounded closed single-zone trace with no "
                "valve, injector, actuator, or command model."
            ),
        ),
    ]


def get_runtime_metadata(
    *, seed: int, analytical_samples: int, cycle_samples: int
) -> ReproducibilityMetadata:
    cantera_module, cantera_version = _cantera_runtime()
    return ReproducibilityMetadata(
        schema_version=SCHEMA_VERSION,
        model_version=MODEL_VERSION,
        solver_version=SOLVER_VERSION,
        python_version=platform.python_version(),
        numpy_version=np.__version__,
        scipy_version=scipy.__version__,
        cantera_version=cantera_version,
        cantera_available=cantera_module is not None,
        mechanism=MECHANISM_NAME,
        mechanism_sha256=mechanism_sha256(),
        random_seed=seed,
        analytical_samples=analytical_samples,
        cycle_samples=cycle_samples,
    )


def get_model_metadata() -> ModelMetadata:
    _, cantera_version = _cantera_runtime()
    return ModelMetadata(
        schema_version=SCHEMA_VERSION,
        model_version=MODEL_VERSION,
        equations={
            "loading_reference": (
                "c_H2 = 0.00078 mol/(kg*bar) * water_density * H2_partial_pressure at 298.15 K"
            ),
            "bubble_diagnostic": (
                "m_H2 = sum(N * pi*d^3/6 * (P_ambient + 4*sigma/d) / (R*T) * M_H2)"
            ),
            "retention": "c(t) = c(0) * exp(-k*t), unless a measured time series is supplied",
            "slider_crank": (
                "x = r*(1-cos(theta)) + l - sqrt(l^2 - (r*sin(theta))^2); V = V_clearance + A*x"
            ),
            "motored": "P*V^gamma = constant; T*V^(gamma-1) = constant",
            "first_law": "dU/dtheta = Qcomb - P*dV/dtheta - Qwall - Qvap",
            "wiebe": "xb = 1 - exp(-a*((theta-theta0)/duration)^(m+1))",
            "wall_heat_transfer": ("Hohenberg-style h = 130*V^-0.06*p_bar^0.8*T^-0.4*(Sp+1.4)^0.8"),
            "uncertainty": "deterministic seeded Latin-hypercube propagation with 95% intervals",
        },
        parameter_definitions={
            "measured_total_h2_mg_l": (
                "Authoritative total concentration; replaces all derived dissolved-plus-bubble "
                "loading"
            ),
            "bubble_population": (
                "Diagnostic size/count population; not proof of gas identity or total hydrogen"
            ),
            "hydrogen_headspace_mole_fraction": (
                "H2 mole fraction in the equilibrating headspace. Henry-law partial pressure "
                "is derived as this fraction times carrier/system pressure, so uncertainty "
                "samples cannot violate partial pressure <= total pressure. The default exact "
                "value 1 is an explicit pure-H2 equilibration assumption"
            ),
            "henry_loading_scale": (
                "Explicit uncertain scale for the NIST reference plus v1 temperature model; "
                "default standard uncertainty is 15% and is sampled by the LHS"
            ),
            "bubble_population.hydrogen_content_scale": (
                "Explicit wide uncertainty for bubble gas identity/content; default standard "
                "uncertainty is 75% and is sampled in addition to size/count uncertainty"
            ),
            "reported_released_fraction": (
                "Optional independent mass-accounting observation used to expose inconsistent "
                "balances"
            ),
            "target_imep_bar": "Requested indicated work used by the feasibility gate",
            "heat_recovery": "Measured external heat recovered per engine cycle",
        },
        valid_domains={
            "water_temperature_k": "273.15 to 373.15 K",
            "water_pressure_bar": "0.2 to 100 bar",
            "hydrogen_headspace_mole_fraction": (
                "0 to 1; derived H2 partial pressure is 0 to 100 bar"
            ),
            "intake_temperature_k": "250 to 500 K",
            "intake_pressure_bar": "0.2 to 5 bar",
            "compression_ratio": "4 to 25",
            "equivalence_ratio": "0.1 to 2.0",
            "cycle": "homogeneous single-zone, -180 to +180 crank-angle degrees",
        },
        mechanism=MECHANISM_NAME,
        mechanism_sha256=mechanism_sha256(),
        cantera_version=cantera_version,
        source_ledger=source_ledger(),
        limitations=[
            (
                "The model is a bounded homogeneous 0D calculation, not CFD and not a spatial "
                "flame model."
            ),
            (
                "Bubble count and diameter cannot establish gas identity; use total-H2 mass "
                "measurement."
            ),
            (
                "The temperature correction to the 298.15 K Henry reference is an explicit "
                "wide assumption."
            ),
            "The Wiebe burn law and Hohenberg-style wall loss require pressure-trace calibration.",
            (
                "Thermal-NOx output is a relative temperature-risk indicator, never a g/kWh "
                "prediction."
            ),
            (
                "No result is hardware-predictive until calibrated against measured pressure "
                "and phase data."
            ),
        ],
    )


def model_metadata() -> ModelMetadata:
    """Backward-friendly alias for API callers."""

    return get_model_metadata()
