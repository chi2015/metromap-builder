# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server at http://localhost:5173
npm run build     # production build (use this to verify no compile errors before finishing)
npm run lint      # ESLint with zero warnings allowed
npm run preview   # serve the dist/ build locally
```

There are no tests. Use `npm run build` as the correctness check after every change.

**Node version constraint:** The project is pinned to Vite 4 because the runtime is Node 16. Do not upgrade Vite or create-vite without checking Node compatibility first. `react-konva@18` is used (not the latest) because React is 18, not 19.

## Architecture

All application state lives in a single `useReducer` in [src/App.jsx](src/App.jsx). Components are pure renderers that receive state as props and call `dispatch`. There is no context, no external state library.

### State shape

```js
{
  lines:           [{ id, name, color, stationIds: [id, ...] }],
  stations:        [{ id, name, x, y }],
  mode:            'select' | 'addStation' | 'connect',
  selectedLineId:  string | null,
  connectingFromId: string | null,   // first station clicked in connect mode
  stationModal:    string | null,    // stationId or '__new__'
  lineModal:       string | null,    // lineId or '__new__'
  past:            [snapshot, ...],  // undo stack (max 20)
  future:          [snapshot, ...],  // redo stack
}
```

Undo/redo snapshots only include `{ lines, stations, selectedLineId }`. Drag frames use `MOVE_STATION` (no history push); drag-end uses `MOVE_STATION_COMMIT` (pushes one entry).

### Auto-redraw mechanism

`MapCanvas` computes a `linePointsMap` via `useMemo` that maps each line's id to a flat `[x0,y0,x1,y1,...]` array derived from `stations`. When any station moves, React re-renders → `useMemo` recomputes affected point arrays → Konva redraws. No imperative canvas calls anywhere.

### Canvas rendering

`MapCanvas` uses `react-konva` with a single `Stage > Layer`. Konva `Group` components are positioned at `station.x / station.y` (not at 0,0), so all child `Circle` and `Text` elements use relative coordinates. Stations snap to a 20 px grid (`snap` helper). The `Rect name="bg"` covers the whole stage and is the only element that fires `handleStageClick` for addStation mode.

Station visual types (mutually exclusive, checked in this order):
1. **Interchange** — appears on ≥ 2 lines (`interchangeSet`): large white circle, black border
2. **Terminal** — first or last of any line AND not interchange (`terminalSet`): larger solid dot
3. **Regular** — everything else: small solid dot in the line's colour

### Connect mode flow

1. First station click → `SET_CONNECTING_FROM` (stored in `connectingFromId`)
2. Second station click:
   - If `selectedLineId` set → `CONNECT_STATIONS` immediately
   - If only one line exists → auto-picks it
   - If multiple lines and none selected → `linePicker` local state shows a floating HTML panel
3. `CONNECT_STATIONS` inserts the new station into `stationIds` adjacent to whichever of the two is already on the line (via `splice`). If neither is on the line, both are appended. Clicking the same station twice resets `connectingFromId`.

**Known limitation:** inserting adjacent to a mid-route station creates an unintended segment to the station's existing neighbour. This is a consequence of the linear-array route model. A proper fix requires switching to an edge-based model `{ edges: [[idA, idB], ...] }`.

### Modal sentinel value

Both `stationModal` and `lineModal` use `'__new__'` as a sentinel to distinguish "create" from "rename". When `stationModal === '__new__'`, the pending canvas coordinates are held in a `useRef` (`pendingCoords`) in `App`, not in reducer state.

### Constants

`src/constants.js` exports `TUBE_COLORS` as `{ hex, name }[]` — imported by both `App.jsx` (for `ADD_LINE` fallback colour selection) and `LineNameModal` (for colour swatch display).

### CSS

All styles are in `src/index.css`. `src/App.css` only overrides `#root` layout. CSS custom properties: `--bg-page`, `--bg-map` (`#F5F2E8` authentic Tube cream), `--bg-chrome`, `--accent`, `--font`, `--radius`.
