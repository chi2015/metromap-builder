# Metro Map Builder

An interactive underground / metro map editor built in the style of Harry Beck's iconic London Underground diagram. Draw routes, place interchange stations, and build your own diagrammatic transit map.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Tech stack

| Library | Role |
|---|---|
| **React 18 + Vite 4** | UI framework & build tooling |
| **react-konva / konva** | Declarative HTML5 Canvas rendering |
| **uuid** | Stable station/line IDs |

## How it works

### Auto-redraw via derived state

Every route line's pixel coordinates are computed from the `stations` array inside a `useMemo`. When you drag a station, the reducer emits `MOVE_STATION` which updates that station's `x`/`y` in state — React re-renders, `useMemo` recomputes the affected line's `points` array, and Konva redraws the line automatically. No imperative canvas mutations.

```
stations[id].x/y changes
  → useMemo recomputes linePointsMap
    → <Line points={...} /> re-renders in Konva
      → canvas redraws at 60 fps
```

### London Underground design language

- **Background** `#F5F2E8` — the authentic off-white cream of printed Tube maps.
- **Line strokes** — 8 px, round caps/joins, TfL official hex colours (Bakerloo brown, Victoria cyan, etc.).
- **Interchange stations** — large white-filled circle with black border, matching the TfL standard symbol.
- **Station labels** — white shadow halo for legibility over coloured routes.
- **Legend pills** — horizontal coloured bars with white text (contrast-adjusted) modelled on the Tube line index.

### Beck's grid aesthetic

Stations snap to a 20 px grid. By keeping placements on this grid and routing lines between snapped points, you naturally get the horizontal/vertical/45-degree diagonal style Harry Beck introduced in 1933.

## Editor modes

| Mode | How to use |
|---|---|
| **Select** (default) | Click a station to rename · Drag to reposition |
| **Add Station** | Click anywhere on the map to drop a new station |
| **Connect** | Select a line in the legend below → click stations to append them to that line |

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Y` / `Ctrl/Cmd + Shift + Z` | Redo |
| `Esc` | Cancel connect operation |

## Right-click menus

- **Right-click a station** — Rename or Delete
- **Right-click a line in the legend** — Rename or Delete
