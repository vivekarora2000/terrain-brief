from __future__ import annotations

import math

import numpy as np

from .models import Point


def height_at(east_m: float, north_m: float, seed: int = 1847) -> float:
    x = east_m / 1000
    n = north_m / 1000
    phase = (seed % 97) / 97
    ridge = 93 * math.exp(-((x - 0.68) ** 2) / 0.11) * (0.82 + 0.18 * math.cos(n * 5.5))
    hills = 38 * math.exp(-((x + 0.52) ** 2 + (n - 0.18) ** 2) / 0.22)
    rolling = 19 * math.sin(x * 3.4 + phase) * math.cos(n * 3.1) + 8 * math.sin((x + n) * 7.2)
    river_center = -0.35 + 0.055 * math.sin(x * 4.1)
    valley = -36 * math.exp(-((n - river_center) ** 2) / 0.06)
    base = 22 + 14 * (n + 1) + 5 * (x + 1)
    return max(3.0, base + ridge + hills + rolling + valley)


def heightfield(seed: int = 1847, size: int = 81) -> dict:
    east = np.linspace(-1000, 1000, size)
    north = np.linspace(-1000, 1000, size)
    heights = np.array([[height_at(float(x), float(y), seed) for x in east] for y in north], dtype=np.float32)
    return {"size": size, "east_m": east.tolist(), "north_m": north.tolist(), "heights_m": heights.round(3).tolist()}


def interpolate(points: list[Point], spacing_m: float = 25) -> list[Point]:
    result: list[Point] = []
    for a, b in zip(points, points[1:]):
        length = math.dist(a, b)
        count = max(1, math.ceil(length / spacing_m))
        result.extend((a[0] + (b[0] - a[0]) * i / count, a[1] + (b[1] - a[1]) * i / count) for i in range(count))
    result.append(points[-1])
    return result


def line_of_sight(start: Point, end: Point, start_height_m: float, end_height_m: float) -> dict:
    points = interpolate([start, end], 20)
    a = height_at(*start) + start_height_m
    b = height_at(*end) + end_height_m
    for index, point in enumerate(points[1:-1], 1):
        t = index / (len(points) - 1)
        sightline = a + (b - a) * t
        terrain = height_at(*point)
        if terrain > sightline:
            return {"visible": False, "obstruction": point, "clearance_m": sightline - terrain, "scope": "terrain-only"}
    return {"visible": True, "obstruction": None, "clearance_m": None, "scope": "terrain-only"}
