---
name: tinyworld-house-crowd-boundary
description: Use when changing Tiny World crowd placement/movement around houses, especially footprint exclusion, exterior-ring detours, and doorway-only crossing.
---

# Tiny World House Crowd Boundary

Use this when editing crowd pathing around houses in
`tiny-world-builder.html` (with optional hook changes in
`vendor/tiny-crowd-layer.js`).

## Core contract

- House collision comes from **rendered mesh bounds**, not raw cell size.
- Crowd can move around the **outer ring** but may only enter/exit a house
  through detected **door gaps**.
- Spawn points must be projected outside house interiors.
- Keep sprite rendering untouched; this is a spatial/pathing layer only.

## Main helpers

- `crowdCollectHouseEnvelopes()` builds per-house envelopes:
  - `inner`: exclusion rectangle in tile space from `Box3` bounds.
  - `outer`: expanded ring used for detours.
  - `doors`: doorway gaps inferred from ground-floor `M.door` meshes.
- `crowdConstrainSegment(start, end, envelopes)` reroutes blocked movement
  to ring paths and doorway transitions.
- `crowdConstrainMoveStep(stepState)` clamps each per-frame crowd step via
  the same envelope logic (wired into `TinyCrowdLayer` as `moveConstraint`).
- Route builders must preserve a seed lead-in when a constrained route would
  collapse to a single waypoint; `TinyCrowdLayer.tickRoute()` treats 1-point
  routes as idle.
- On very sparse boards, short ambient routes should fall back to a longer
  perimeter circuit instead of jittering around the same open tile cluster.
- On 2-open-tile boards, route directly between the two open cells instead of
  injecting a house visit that pulls walkers back to the house edge.
- Ambient routes should be one-shot: when a walker finishes a route, replan a
  fresh wander route with a short optional pause instead of looping the same
  path forever.
- Wander points should cover more of each tile than just the center so people
  can drift near edges and corners, not orbit one spot.
- After a house add/remove, refresh ambient routes once so walkers pick up the
  new walkable tiles without clearing active house-visit or rain-shelter state.

## Edge-house and portal rules

- For houses on board edges, use the raw mesh bounds to detect doors, but clip
  the navigable `inner` rect to the on-board crowd rectangle. This avoids
  marking unavoidable board-edge spawn points as still "inside" a house.
- When there are no path tiles, fallback crowd seeds/routes must exclude
  occupied house cells. Use non-house cells for exterior movement and add
  separate interior visit targets only for unblocked doors.
- Door travel needs a direct portal corridor exception: once a step is already
  inside the chosen door gap corridor, do not snap it back out to the door's
  outside anchor or the person will oscillate at the threshold.
- Door portal exceptions must stay corridor-aligned. Being near a doorway is
  not enough to permit an arbitrary diagonal segment through the wall.
- Route targets and per-frame steps need a wall-buffer cleanup around house
  envelopes, especially on board-edge houses where the detour ring can collapse
  onto an actual wall edge.
- If `crowdConstrainMoveStep()` collapses a move back onto the current stop
  after house normalization, return `advanceTarget: true` so
  `TinyCrowdLayer.tickRoute()` can step to the next waypoint instead of
  freezing on an interior stop.
- On ultra-sparse boards, skip ambient house-visit dwell so the crowd keeps
  circulating instead of parking on the only walkable tile.
- Ambient house visits should target interior stop points only. Exterior door
  anchors are route waypoints for crossing the portal, not standalone visit
  destinations, or people can appear parked outside the house.
- Doorway recovery should measure actual displacement over time, not just
  nonzero speed. A person can report speed while route constraints keep them
  visually pinned in the door portal.
- Rain/storm can repurpose the same envelope graph to send active people to
  the nearest interior stop point, then stage a clear-weather exit in a small
  outside queue before restoring each person's saved route.
- When rain shelter ends, clear `routeHold` instead of restoring an old dwell
  timer; otherwise people can appear stuck at a doorway/interior visit point
  for long house-visit holds right after rain stops.

## Door-gap detection notes

- Ground-floor doors only: ignore elevated/upper doors by filtering with
  `centerY - houseBaseY`.
- Door side is resolved from nearest `inner` face (`n/s/e/w`).
- Multiple door meshes on one side are merged into a wider passable gap.

## Invalidation + refresh

- Any house mesh add/remove must call `crowdMarkHouseEnvelopeDirty()`.
- Frame loop checks `crowdHouseEnvelopeDirty` and refreshes routes once so
  crowd paths stay aligned after edits.

## Validation checklist

- `npm test` passes.
- After reseed, no person starts inside a house envelope.
- Over time, crowd steps do not cross house walls from non-door sides.
- Forced door in/out route crosses the envelope boundary only near door-gap
  points.
- Rotated and multi-cell house probes keep door sides aligned with geometry.
