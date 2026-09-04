"""Mock 50 Hz PWM drive-cycle traces for Allure demo cases."""

from __future__ import annotations

import numpy as np


def mock_steady_drive(*, n: int = 10_000, fs: float = 10_000.0, seed: int = 7) -> dict[str, dict[str, list[float]]]:
    rng = np.random.default_rng(seed)
    t = np.arange(n, dtype=np.float64) / fs
    w = 2 * np.pi * 50.0
    carrier = 2 * np.pi * 2_000.0

    u_peak = 311.0
    i_peak = 15.0
    pwm = 8.0 * np.sin(carrier * t)
    noise_v = rng.normal(0, 1.2, n)
    noise_i = rng.normal(0, 0.08, n)

    uu = u_peak * np.sin(w * t) + pwm + noise_v
    vv = u_peak * np.sin(w * t - 2 * np.pi / 3) + pwm * 0.95 + noise_v * 0.6
    ww = u_peak * np.sin(w * t + 2 * np.pi / 3) + pwm * 0.9 + noise_v * 0.5

    iu = i_peak * np.sin(w * t - 0.35) + noise_i
    iv = i_peak * np.sin(w * t - 2 * np.pi / 3 - 0.35) + noise_i * 0.9
    iw = i_peak * np.sin(w * t + 2 * np.pi / 3 - 0.35) + noise_i * 0.85

    uu[n // 5] = 420.0
    iu[n // 3] = 28.0
    vv[n // 2] = -390.0

    speed = 2900 + 40 * np.sin(2 * np.pi * 0.4 * t) + rng.normal(0, 3, n)
    load = 75 + 6 * np.sin(2 * np.pi * 0.25 * t) + rng.normal(0, 0.4, n)

    def pack(arr: np.ndarray) -> list[float]:
        return np.round(arr, 3).tolist()

    return {
        "voltage": {"Uu": pack(uu), "Vv": pack(vv), "Ww": pack(ww)},
        "current": {"Iu": pack(iu), "Iv": pack(iv), "Iw": pack(iw)},
        "motor": {"speed": pack(speed), "load": pack(load)},
    }
