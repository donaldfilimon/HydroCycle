"""Small deterministic uncertainty primitives used by the scientific solver."""

from __future__ import annotations

from math import exp, log, sqrt
from statistics import NormalDist

import numpy as np
from scipy.stats import qmc

from .schemas import Distribution, Interval95, ValueWithUncertainty


def latin_hypercube(sample_count: int, dimensions: int, seed: int) -> np.ndarray:
    """Return a reproducible stratified matrix over the open unit hypercube."""

    if sample_count < 1:
        raise ValueError("sample_count must be positive")
    if dimensions < 0:
        raise ValueError("dimensions must be nonnegative")
    if seed < 0:
        raise ValueError("seed must be nonnegative")
    if dimensions == 0:
        return np.empty((sample_count, 0), dtype=float)
    sampler = qmc.LatinHypercube(d=dimensions, scramble=True, seed=seed)
    return np.asarray(sampler.random(n=sample_count), dtype=float)


def sample_quantity(quantity: ValueWithUncertainty, probability: float) -> float:
    """Map a unit-hypercube coordinate to a quantity's declared distribution."""

    if quantity.value is None:
        raise ValueError("a missing quantity cannot be sampled")
    probability = min(max(probability, 1.0e-12), 1.0 - 1.0e-12)
    center = quantity.value
    sigma = quantity.standard_uncertainty
    if quantity.distribution is Distribution.NORMAL:
        return center + sigma * NormalDist().inv_cdf(probability)
    if quantity.distribution is Distribution.LOGNORMAL:
        if center <= 0.0:
            raise ValueError("a lognormal quantity must have a positive arithmetic mean")
        if sigma == 0.0:
            return center
        variance_ratio = (sigma / center) ** 2
        log_sigma = sqrt(log(1.0 + variance_ratio))
        log_mean = log(center) - 0.5 * log_sigma**2
        return exp(log_mean + log_sigma * NormalDist().inv_cdf(probability))
    if quantity.distribution is Distribution.UNIFORM:
        return center + sigma * sqrt(3.0) * (2.0 * probability - 1.0)
    if quantity.distribution is Distribution.TRIANGULAR:
        half_width = sigma * sqrt(6.0)
        if probability < 0.5:
            return center + half_width * (sqrt(2.0 * probability) - 1.0)
        return center + half_width * (1.0 - sqrt(2.0 * (1.0 - probability)))
    return center


def interval_95(values: list[float] | np.ndarray, unit: str) -> Interval95:
    """Summarize a finite sample using the empirical central 95% interval."""

    array = np.asarray(values, dtype=float)
    if array.size == 0 or not np.all(np.isfinite(array)):
        raise ValueError("interval input must contain finite values")
    lower, median, upper = np.quantile(array, [0.025, 0.5, 0.975])
    return Interval95(lower=float(lower), median=float(median), upper=float(upper), unit=unit)
