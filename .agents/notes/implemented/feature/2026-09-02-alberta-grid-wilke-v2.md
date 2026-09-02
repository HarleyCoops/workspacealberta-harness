# Agent Note: Alberta Grid v2 Wilke-honest encodings

Status: implemented

English | [中文](2026-09-02-alberta-grid-wilke-v2.zh.md)

## Problem

The Grid tab (`conversation.view` id `alberta-grid`) encoded AESO Current Supply Demand and pool price primarily as a Three.js diorama: a glowing AIL volume, fuel towers in perspective, an intertie ribbon, and a price pulse. Those marks violate Claus Wilke, *Fundamentals of Data Visualization* ch.17 (bars must start at 0; ink must be proportional), ch.4 (qualitative vs sequential color roles; no rainbow), and ch.26 (do not use gratuitous 3D for comparisons that must stay invertible in 2D). The HUD also printed the CSD `Last update` stamp, which made a 90-second live poll look hours old. A 2D canvas fallback still used a pulsing circle for AIL and omitted always-visible MW / % of AIL labels. Raspberry Pi deploys need the same tab id so :3081 can pick up one Grid tab.

## Decision

`@workspacealberta/ui-alberta-grid` keeps id `alberta-grid` and upgrades the view in place.

The primary encoding is always a React 2D layout: aligned fuel bars from a shared 0 baseline (Solar / Wind / Gas (cogen+CC+steam+SC) / Hydro+Other / Storage) labeled MW and % of AIL; a large AIL number; pool price as `$/MWh` plus a cool–amber–hot sequential/diverging ramp (thresholds $40 and $100, painted domain $0–$400); signed BC / Montana intertie bars growing left (import) or right (export) from 0. Fuel colors are a fixed Okabe–Ito-like qualitative set in `encodings.ts`, reused by the legend and any 3D panel. The HUD shows poll health (`Live AESO feed` / stale / unreachable) from the client `fetchedAt` clock. The CSD stamp is still parsed on `CsdSnapshot.lastUpdate` and is never rendered.

`?lite` (`URLSearchParams.has('lite')`) or a failed / software WebGL probe leaves the 2D bars mounted and does not construct `WebGLRenderer`. When hardware WebGL is available, a secondary orbit panel may mount: a fixed-size translucent load vessel (not scaled by AIL), fuel columns that reuse the same hues, and a ground-plane signed intertie mark. Price is never bloom intensity. Drag orbits; wheel zooms. The panel is not required to read any value.

Feeds stay `https://web-production-02936.up.railway.app/api/csd` and `.../api/price`. Poll interval is 90s. Solar remains AESO-visible (>5 MW). The Railway app is not modified. Wiring stays `workspace-alberta.patch.yml` insert `ui-alberta-grid`.

## Alternatives considered

**Replace the tab with `alberta-grid-v2`.** Rejected: Pi deploy is one Grid tab; a second id would leave the old diorama mounted beside v2 or require a coordinated roster edit during a live :3081 relaunch.

**Keep Three.js as the primary mark and only restyle it.** Rejected: perspective height and bloom cannot satisfy proportional ink or invertible comparison, and the 2D fallback would still be a second, weaker encoding.

**Drop Three.js entirely.** Rejected: an optional orbit metaphor is allowed when 2D remains authoritative; removing the dependency would shrink the bundle further but is not required to ship honest encodings.

**Show the CSD last-update stamp next to poll health.** Rejected: the stamp is why the live feed looked stale; keeping it on screen reintroduces the defect.

## Consequences

Readers can compare fuels, AIL, price, and BC/Montana interchange from the 2D bars and numbers alone, including on `?lite` and software-GL hosts. The 3D panel is GPU-only and uncovered in the jsdom lane; `canUseWebGL` / `shouldMountThree` / `createGridScene` null paths are unit-tested, and the renderer class is explicitly coverage-ignored. Package tests pin parsers, encodings, HUD copy (no `Last update`), hover MW/%, and HMR teardown of the view registration.
