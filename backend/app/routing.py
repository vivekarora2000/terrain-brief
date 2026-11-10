from __future__ import annotations

import heapq
import math
from copy import deepcopy

from .models import SceneState
from .scene import EDGES
from .terrain import height_at, interpolate


def edge_metrics(edge: dict) -> dict:
    points = interpolate(edge["points"], 25)
    samples, distance, max_grade = [], 0.0, 0.0
    for index, point in enumerate(points):
        elevation = height_at(*point)
        grade = 0.0
        if index:
            horizontal = math.dist(point, points[index - 1])
            distance += horizontal
            grade = abs(elevation - height_at(*points[index - 1])) / horizontal * 100 if horizontal else 0
            max_grade = max(max_grade, grade)
        samples.append({"distance_m":distance,"elevation_m":elevation,"grade_percent":grade,"point":point})
    return {"length_m":distance,"max_grade_percent":max_grade,"samples":samples}


def assess(scene: SceneState, edge: dict, mode: str) -> dict:
    metrics = edge_metrics(edge)
    failures = []
    if edge.get("bridge_id") and not scene.bridge_status[edge["bridge_id"]]: failures.append(f'{edge["name"]} is closed')
    if edge["width_m"] < scene.vehicle.width_m + 0.4: failures.append("Width margin is below 0.4 m")
    if edge.get("capacity_t") is not None and edge["capacity_t"] < scene.vehicle.weight_t: failures.append("Known capacity is below vehicle weight")
    if edge.get("clearance_m") is not None and edge["clearance_m"] < scene.vehicle.height_m + 0.2: failures.append("Known clearance is below configured margin")
    if metrics["max_grade_percent"] > scene.vehicle.max_grade_percent: failures.append("Sampled grade exceeds configured maximum")
    if mode == "strict" and edge["unknown"]: failures.append("Required attributes are unknown in strict mode")
    return {**metrics,"failures":failures,"unknowns":edge["unknown"]}


def _find(scene: SceneState, mode: str, excluded: set[str] | None = None) -> dict:
    excluded = excluded or set()
    start, goal = "village-node", "clearing-node"
    distances = {start:0.0}
    previous: dict[str,tuple[str,dict]] = {}
    queue = [(0.0,start)]
    while queue:
        distance,current = heapq.heappop(queue)
        if distance != distances.get(current): continue
        if current == goal: break
        for edge in EDGES:
            if edge["id"] in excluded: continue
            neighbor = edge["to"] if edge["from"] == current else edge["from"] if edge["to"] == current else None
            if neighbor is None: continue
            evaluation = assess(scene,edge,mode)
            if evaluation["failures"]: continue
            candidate = distance + evaluation["length_m"] + (45 if evaluation["unknowns"] else 0)
            if candidate < distances.get(neighbor,math.inf):
                distances[neighbor] = candidate
                previous[neighbor] = (current,edge)
                heapq.heappush(queue,(candidate,neighbor))
    if goal not in previous:
        closed = [name for key,name in (("main-bridge","Main Bridge"),("east-bridge","East Bridge")) if not scene.bridge_status[key]]
        return {"status":"none","edge_ids":[],"geometry":[],"distance_m":0,"max_grade_percent":0,"elevation":[],"checks":[],"unknowns":[],"reason":f'No route under current constraints.{" Closed: " + ", ".join(closed) if closed else ""}'}
    path, cursor = [], goal
    while cursor != start:
        prior,edge = previous[cursor]
        path.insert(0,edge)
        cursor = prior
    node, geometry, unknowns = start, [], []
    for edge in path:
        points = edge["points"] if edge["from"] == node else list(reversed(edge["points"]))
        geometry.extend(points if not geometry else points[1:])
        node = edge["to"] if edge["from"] == node else edge["from"]
        unknowns.extend(f'{edge["name"]}: {item}' for item in edge["unknown"])
    samples = interpolate(geometry,25)
    elevation, distance, max_grade = [], 0.0, 0.0
    for index,point in enumerate(samples):
        h = height_at(*point); grade = 0.0
        if index:
            horizontal = math.dist(point,samples[index-1]); distance += horizontal
            grade = abs(h-height_at(*samples[index-1]))/horizontal*100 if horizontal else 0
            max_grade = max(max_grade,grade)
        elevation.append({"distance_m":distance,"elevation_m":h,"grade_percent":grade,"point":point})
    checks = [
        {"label":"Road width","status":"pass","detail":"All segments preserve the configured width margin."},
        {"label":"Maximum grade","status":"pass","detail":f'{max_grade:.1f}% sampled at 25 m intervals.'},
        {"label":"Bridge status","status":"pass","detail":"All crossings on this candidate are open."},
        {"label":"Unknown attributes","status":"review" if unknowns else "pass","detail":"; ".join(unknowns) if unknowns else "Known capacity and clearance checks pass."},
    ]
    return {"id":":".join(edge["id"] for edge in path),"status":"review" if unknowns else "candidate","edge_ids":[edge["id"] for edge in path],"geometry":geometry,"distance_m":distance,"max_grade_percent":max_grade,"elevation":elevation,"checks":checks,"unknowns":unknowns}


def compute_routes(scene: SceneState, mode: str) -> dict:
    primary = _find(scene,mode)
    if primary["status"] == "none": return {"primary":primary,"alternative":None}
    alternatives = [_find(scene,mode,{edge_id}) for edge_id in primary["edge_ids"]]
    alternatives = [route for route in alternatives if route["status"] != "none" and route["id"] != primary["id"]]
    alternative = min(alternatives,key=lambda route:route["distance_m"],default=None)
    return {"primary":primary,"alternative":alternative}
