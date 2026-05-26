---
name: tinyworld-crowd-trail
description: Use when changing or verifying persistent red walk trails / footprint decals for moving crowd members in Tiny World Builder.
---

# Tiny World Crowd Trail

Use this skill when editing the persistent red walk trail system for crowd members.

Core rules:

- Trail marks must stay tile-local and persistent after the walker moves on.
- Paint the exact path the person actually crossed, not the destination route or the whole tile.
- Prefer a continuous, thick stroke over separated blobs when the user wants a line trail.
- Render the trail as an overlay decal so it stays visible at close top-down zoom.
- Reposition marks when tiles rebuild so the trail stays attached to the live tile surface.
- Clear trail state when the scene is reset or reloaded.

Verification:

- Run `npm test`.
- Confirm no console errors.
- Visually verify in the browser that the red trail is on the tile surface and remains after the person leaves.
