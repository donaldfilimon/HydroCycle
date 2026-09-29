"""Absolute enthalpies and water saturation (foundation; stdlib only).

Gas species use the NASA 7-coefficient fits copied verbatim from Cantera 3.2's gri30.yaml
(GRI-Mech 3.0) [LIT]. Liquid water uses the CODATA formation enthalpy and a constant molar
heat capacity at 298.15 K [LIT, P]; valid 273.16 K to about 450 K. Saturation pressure is
the Wagner-Pruss equation (IAPWS 1992 supplementary release) [LIT]. h_fg is the difference
of the vapour and liquid functions here, never a separate constant (model spec rule 7).
"""

from __future__ import annotations

from math import exp
from typing import Final

R_U: Final = 8.314462618  # J/(mol K), CODATA 2018 [LIT]
T_REF: Final = 298.15  # K

MOLAR_MASS: Final[dict[str, float]] = {
    "H2": 0.00201588,
    "O2": 0.0319988,
    "N2": 0.0280134,
    "H2O": 0.01801528,
}

# (t_low, t_mid, t_high, low-range coefficients, high-range coefficients), gri30.yaml.
_NASA7: Final[dict[str, tuple[float, float, float, tuple[float, ...], tuple[float, ...]]]] = {
    "H2": (
        200.0,
        1000.0,
        3500.0,
        (
            2.34433112,
            7.98052075e-03,
            -1.9478151e-05,
            2.01572094e-08,
            -7.37611761e-12,
            -917.935173,
            0.683010238,
        ),
        (
            3.3372792,
            -4.94024731e-05,
            4.99456778e-07,
            -1.79566394e-10,
            2.00255376e-14,
            -950.158922,
            -3.20502331,
        ),
    ),
    "O2": (
        200.0,
        1000.0,
        3500.0,
        (
            3.78245636,
            -2.99673416e-03,
            9.84730201e-06,
            -9.68129509e-09,
            3.24372837e-12,
            -1063.94356,
            3.65767573,
        ),
        (
            3.28253784,
            1.48308754e-03,
            -7.57966669e-07,
            2.09470555e-10,
            -2.16717794e-14,
            -1088.45772,
            5.45323129,
        ),
    ),
    "N2": (
        300.0,
        1000.0,
        5000.0,
        (3.298677, 1.4082404e-03, -3.963222e-06, 5.641515e-09, -2.444854e-12, -1020.8999, 3.950372),
        (2.92664, 1.4879768e-03, -5.68476e-07, 1.0097038e-10, -6.753351e-15, -922.7977, 5.980528),
    ),
    "H2O": (
        200.0,
        1000.0,
        3500.0,
        (
            4.19864056,
            -2.0364341e-03,
            6.52040211e-06,
            -5.48797062e-09,
            1.77197817e-12,
            -3.02937267e04,
            -0.849032208,
        ),
        (
            3.03399249,
            2.17691804e-03,
            -1.64072518e-07,
            -9.7041987e-11,
            1.68200992e-14,
            -3.00042971e04,
            4.9667701,
        ),
    ),
}
_EXTRAPOLATION_FLOOR_K: Final = 200.0  # low polynomials are used down to here, as Cantera does

H_F_LIQUID_WATER: Final = -285_830.0  # J/mol at 298.15 K, CODATA [LIT]
CP_LIQUID_WATER_MOLAR: Final = 75.327  # J/(mol K) at 298.15 K [LIT], held constant [P]

_T_CRIT: Final = 647.096  # K
_P_CRIT: Final = 22.064e6  # Pa
_T_TRIPLE: Final = 273.16  # K
_WAGNER: Final = (-7.85951783, 1.84408259, -11.7866497, 22.6807411, -15.9618719, 1.80122502)


def _coefficients(species: str, t_k: float) -> tuple[float, ...]:
    _t_low, t_mid, t_high, low, high = _NASA7[species]
    if not _EXTRAPOLATION_FLOOR_K <= t_k <= t_high:
        raise ValueError(
            f"{species} temperature {t_k} K is outside [{_EXTRAPOLATION_FLOOR_K}, {t_high}] K"
        )
    return low if t_k <= t_mid else high


def cp_molar(species: str, t_k: float) -> float:
    a = _coefficients(species, t_k)
    return R_U * (a[0] + a[1] * t_k + a[2] * t_k**2 + a[3] * t_k**3 + a[4] * t_k**4)


def h_molar(species: str, t_k: float) -> float:
    a = _coefficients(species, t_k)
    return (
        R_U
        * t_k
        * (
            a[0]
            + a[1] * t_k / 2
            + a[2] * t_k**2 / 3
            + a[3] * t_k**3 / 4
            + a[4] * t_k**4 / 5
            + a[5] / t_k
        )
    )


def u_molar(species: str, t_k: float) -> float:
    return h_molar(species, t_k) - R_U * t_k


def h_mass(species: str, t_k: float) -> float:
    return h_molar(species, t_k) / MOLAR_MASS[species]


def _check_liquid_range(t_k: float) -> None:
    if not _T_TRIPLE <= t_k <= _T_CRIT:
        raise ValueError(f"liquid water temperature {t_k} K is outside [{_T_TRIPLE}, {_T_CRIT}] K")


def h_liquid_water_molar(t_k: float) -> float:
    _check_liquid_range(t_k)
    return H_F_LIQUID_WATER + CP_LIQUID_WATER_MOLAR * (t_k - T_REF)


def h_liquid_water_mass(t_k: float) -> float:
    return h_liquid_water_molar(t_k) / MOLAR_MASS["H2O"]


def p_sat(t_k: float) -> float:
    _check_liquid_range(t_k)
    tau = 1.0 - t_k / _T_CRIT
    a1, a2, a3, a4, a5, a6 = _WAGNER
    exponent = (_T_CRIT / t_k) * (
        a1 * tau + a2 * tau**1.5 + a3 * tau**3 + a4 * tau**3.5 + a5 * tau**4 + a6 * tau**7.5
    )
    return _P_CRIT * exp(exponent)


def t_sat(p_pa: float) -> float:
    if not p_sat(_T_TRIPLE) <= p_pa <= _P_CRIT:
        raise ValueError(f"pressure {p_pa} Pa is outside the saturation range")
    low, high = _T_TRIPLE, _T_CRIT
    for _ in range(200):
        mid = 0.5 * (low + high)
        if p_sat(mid) < p_pa:
            low = mid
        else:
            high = mid
        if high - low < 1e-10:
            break
    return 0.5 * (low + high)


def h_fg(t_k: float) -> float:
    return (h_molar("H2O", t_k) - h_liquid_water_molar(t_k)) / MOLAR_MASS["H2O"]


LHV_H2: Final = (
    -(h_molar("H2O", T_REF) - h_molar("H2", T_REF) - 0.5 * h_molar("O2", T_REF)) / MOLAR_MASS["H2"]
)
