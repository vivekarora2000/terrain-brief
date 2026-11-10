# Terrain Brief

Terrain Brief is an interactive fictional 3D landscape for exploring terrain, inspecting scene features, and comparing candidate road routes for a civilian relief-supply truck.

The current release opens into the authored **Hillside Relief Delivery** scenario. It includes a procedural heightfield, roads, two bridge crossings, a village, a farm, a ridge clearing, and a configurable vehicle profile.

## Features

- Interactive Three.js terrain with orbit, pan, zoom, labels, and contours
- Structured, versioned scene data using a local east/north metric grid
- Deterministic commands for moving the farm, calculating a route, changing bridge status, changing views, and resetting the scene
- Dijkstra road routing with grade, width, clearance, capacity, bridge-status, and unknown-attribute checks
- Primary and genuine alternative routes
- Strict and exploratory handling of unknown attributes
- Route elevation profile synchronized with the scene
- Feature and road-segment inspection
- Terrain-only line-of-sight analysis
- Undo/redo, browser persistence, and JSON import/export
- Presentation mode and responsive mobile layout

This is an illustrative sandbox. It does not provide real-world navigation, emergency-routing, or vehicle-safety guidance.

## Frontend setup

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

Production build:

```bash
npm run build
npm run preview
```

## Coordinate convention

Scene coordinates use meters relative to the center of a fictional 2 km × 2 km model:

- Positive horizontal x is east.
- Positive horizontal y is north.
- Elevation is meters above a local fictional datum.
- Three.js receives x as east, negative z as north, and y as elevation.
- No real geographic coordinates are assigned.

Terrain and route sampling use the same deterministic `heightAt` function. Longitudinal grade is sampled every 25 meters.

## Supported demo commands

- `Move the farm farther north.`
- `Show the view from the village.`
- `How can the truck reach the clearing?`
- `Close the main bridge.`
- `Reopen the main bridge.`
- `Reset the scene.`

The current command layer is intentionally bounded and deterministic. It does not yet construct an arbitrary new world from an unrestricted description.

## Project structure

```text
app/          Main workspace and styles
components/   3D terrain viewport and elevation profile
lib/          Scene schema, terrain calculations, routing, and state
backend/      Python terrain and routing modules
public/       Static application assets
```

## Backend modules

`backend/` contains the Python terrain, scene-schema, line-of-sight, and routing implementation using NumPy and Pydantic. The current browser demo runs locally without requiring the Python service.

Install the Python module dependencies from `backend/pyproject.toml` when developing that engine.

## Limitations

- The first release uses one bounded fictional scene.
- Commands are scripted rather than model-generated.
- Routing is restricted to the authored road graph; off-road traversal is not modeled.
- Bridge capacity and other unknown values remain explicitly unverified.
- Browser persistence is device-local and has no collaboration layer.
