import math
from typing import Sequence


def log1p_norm(value: float) -> float:
    """log(1 + x) — compresses large citation counts into a more linear scale."""
    return math.log1p(max(0.0, value))


def minmax(values: Sequence[float]) -> list[float]:
    """
    Min-max normalize a sequence of floats to [0, 1].
    Returns all zeros if all values are equal.
    """
    if not values:
        return []
    lo = min(values)
    hi = max(values)
    if hi == lo:
        return [0.0] * len(values)
    return [(v - lo) / (hi - lo) for v in values]


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    if denominator == 0:
        return default
    return numerator / denominator


def clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def renormalize_weights(weights: dict[str, float], available: set[str]) -> dict[str, float]:
    """
    Given a weight dict and a set of available signal keys, redistribute weight
    from missing signals proportionally to available ones.
    Returns a new weight dict that sums to 1.0.
    """
    active = {k: v for k, v in weights.items() if k in available}
    total = sum(active.values())
    if total == 0:
        equal = 1.0 / len(active) if active else 0.0
        return {k: equal for k in active}
    return {k: v / total for k, v in active.items()}
