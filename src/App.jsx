import { useReducer, useCallback, useEffect, useRef } from 'react'
import { v4 as uuid } from 'uuid'
import MapCanvas from './components/MapCanvas'
import Toolbar from './components/Toolbar'
import LineLegend from './components/LineLegend'
import StationNameModal from './components/StationNameModal'
import LineNameModal from './components/LineNameModal'
import './App.css'
import { TUBE_COLORS } from './constants'

// Seed three lines and eight stations so the user sees a real map on first load
function createSeedData() {
  const s1 = { id: uuid(), name: 'Paddington',      x: 140, y: 200 }
  const s2 = { id: uuid(), name: 'Oxford Circus',   x: 340, y: 200 }
  const s3 = { id: uuid(), name: 'Liverpool St',    x: 580, y: 200 }
  const s4 = { id: uuid(), name: 'Waterloo',        x: 340, y: 380 }
  const s5 = { id: uuid(), name: 'Brixton',         x: 340, y: 520 }
  const s6 = { id: uuid(), name: "King's Cross",    x: 480, y: 120 }
  const s7 = { id: uuid(), name: 'Heathrow',        x: 80,  y: 120 }
  const s8 = { id: uuid(), name: 'Hammersmith',     x: 80,  y: 380 }

  return {
    stations: [s1, s2, s3, s4, s5, s6, s7, s8],
    lines: [
      { id: uuid(), name: 'Bakerloo',  color: '#B36305', stationIds: [s7.id, s1.id, s2.id, s4.id, s5.id] },
      { id: uuid(), name: 'Victoria',  color: '#0098D4', stationIds: [s6.id, s2.id, s4.id, s5.id] },
      { id: uuid(), name: 'Piccadilly',color: '#003688', stationIds: [s7.id, s1.id, s6.id, s3.id] },
    ],
  }
}

const MAX_HISTORY = 20

// Snapshot of undo-able fields only
function snapshot({ lines, stations, selectedLineId }) {
  return { lines, stations, selectedLineId }
}

// Append current state to history and clear future
function pushHistory(state) {
  return {
    ...state,
    past:   [...state.past, snapshot(state)].slice(-MAX_HISTORY),
    future: [],
  }
}

function reducer(state, action) {
  switch (action.type) {

    case 'SET_MODE':
      return { ...state, mode: action.mode, connectingFromId: null }

    case 'SELECT_LINE':
      return { ...state, selectedLineId: action.lineId }

    case 'ADD_STATION': {
      const station = { id: uuid(), name: action.name || 'New Station', x: action.x, y: action.y }
      return pushHistory({ ...state, stations: [...state.stations, station] })
    }

    // Dragging — no history entry (too many intermediate frames)
    case 'MOVE_STATION': {
      const stations = state.stations.map(s =>
        s.id === action.id ? { ...s, x: action.x, y: action.y } : s
      )
      return { ...state, stations }
    }

    // Drag end — push one history entry
    case 'MOVE_STATION_COMMIT': {
      const stations = state.stations.map(s =>
        s.id === action.id ? { ...s, x: action.x, y: action.y } : s
      )
      return pushHistory({ ...state, stations })
    }

    case 'RENAME_STATION': {
      const stations = state.stations.map(s =>
        s.id === action.id ? { ...s, name: action.name } : s
      )
      return pushHistory({ ...state, stations })
    }

    case 'DELETE_STATION': {
      return pushHistory({
        ...state,
        stations: state.stations.filter(s => s.id !== action.id),
        lines:    state.lines.map(l => ({ ...l, stationIds: l.stationIds.filter(id => id !== action.id) })),
      })
    }

    case 'ADD_LINE': {
      const usedColors = state.lines.map(l => l.color)
      const fallback = TUBE_COLORS.find(c => !usedColors.includes(c.hex))?.hex ?? TUBE_COLORS[0].hex
      const color = action.color || fallback
      const line  = { id: uuid(), name: action.name || 'New Line', color, stationIds: [] }
      return pushHistory({ ...state, lines: [...state.lines, line], selectedLineId: line.id })
    }

    case 'RENAME_LINE': {
      const lines = state.lines.map(l => l.id === action.id ? { ...l, name: action.name } : l)
      return pushHistory({ ...state, lines })
    }

    case 'DELETE_LINE': {
      return pushHistory({
        ...state,
        lines:         state.lines.filter(l => l.id !== action.id),
        selectedLineId: state.selectedLineId === action.id ? null : state.selectedLineId,
      })
    }

    case 'SET_CONNECTING_FROM':
      return { ...state, connectingFromId: action.stationId }

    case 'CONNECT_STATIONS': {
      const { lineId, fromId, toId } = action
      if (fromId === toId) return { ...state, connectingFromId: null }

      const lines = state.lines.map(l => {
        if (l.id !== lineId) return l
        const ids     = [...l.stationIds]
        const fromIdx = ids.indexOf(fromId)
        const toIdx   = ids.indexOf(toId)

        if (fromIdx === -1 && toIdx === -1)
          return { ...l, stationIds: [...ids, fromId, toId] }
        if (fromIdx !== -1 && toIdx === -1) {
          ids.splice(fromIdx + 1, 0, toId)
          return { ...l, stationIds: ids }
        }
        if (fromIdx === -1 && toIdx !== -1) {
          ids.splice(toIdx, 0, fromId)
          return { ...l, stationIds: ids }
        }
        return l
      })
      return pushHistory({ ...state, lines, connectingFromId: null })
    }

    case 'UNDO': {
      if (!state.past.length) return state
      const past   = [...state.past]
      const snap   = past.pop()
      const future = [snapshot(state), ...state.future].slice(0, MAX_HISTORY)
      return { ...state, ...snap, past, future }
    }

    case 'REDO': {
      if (!state.future.length) return state
      const future = [...state.future]
      const snap   = future.shift()
      const past   = [...state.past, snapshot(state)].slice(-MAX_HISTORY)
      return { ...state, ...snap, past, future }
    }

    case 'SHOW_STATION_MODAL': return { ...state, stationModal: action.stationId }
    case 'HIDE_STATION_MODAL':  return { ...state, stationModal: null }
    case 'SHOW_LINE_MODAL':    return { ...state, lineModal: action.lineId }
    case 'HIDE_LINE_MODAL':    return { ...state, lineModal: null }

    default:
      return state
  }
}

const seed = createSeedData()
const initialState = {
  ...seed,
  mode: 'select',
  selectedLineId:    null,
  connectingFromId:  null,
  stationModal:      null,
  lineModal:         null,
  past:              [],
  future:            [],
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  // Holds canvas coords while the name-modal is open for a brand-new station
  const pendingCoords = useRef(null)

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault(); dispatch({ type: 'UNDO' })
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault(); dispatch({ type: 'REDO' })
      }
      if (e.key === 'Escape') {
        dispatch({ type: 'SET_CONNECTING_FROM', stationId: null })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Canvas click while in addStation mode — save coords, open modal
  const handleCanvasAddStation = useCallback((x, y) => {
    pendingCoords.current = { x, y }
    dispatch({ type: 'SHOW_STATION_MODAL', stationId: '__new__' })
  }, [])

  const handleStationModalConfirm = useCallback((name) => {
    if (state.stationModal === '__new__') {
      const { x, y } = pendingCoords.current || { x: 300, y: 300 }
      pendingCoords.current = null
      dispatch({ type: 'ADD_STATION', name, x, y })
    } else {
      dispatch({ type: 'RENAME_STATION', id: state.stationModal, name })
    }
    dispatch({ type: 'HIDE_STATION_MODAL' })
  }, [state.stationModal])

  const handleStationModalCancel = useCallback(() => {
    pendingCoords.current = null
    dispatch({ type: 'HIDE_STATION_MODAL' })
  }, [])

  const handleLineModalConfirm = useCallback((name, color) => {
    if (state.lineModal === '__new__') {
      dispatch({ type: 'ADD_LINE', name, color })
    } else {
      dispatch({ type: 'RENAME_LINE', id: state.lineModal, name })
    }
    dispatch({ type: 'HIDE_LINE_MODAL' })
  }, [state.lineModal])

  const currentStation = state.stationModal && state.stationModal !== '__new__'
    ? state.stations.find(s => s.id === state.stationModal) : null

  const currentLine = state.lineModal && state.lineModal !== '__new__'
    ? state.lines.find(l => l.id === state.lineModal) : null

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">Metro Map Builder</span>
        <span className="app-subtitle">London Underground style — interactive diagram editor</span>
      </header>

      <Toolbar
        mode={state.mode}
        canUndo={state.past.length > 0}
        canRedo={state.future.length > 0}
        dispatch={dispatch}
        onAddLine={() => dispatch({ type: 'SHOW_LINE_MODAL', lineId: '__new__' })}
      />

      <main className="app-body">
        <MapCanvas
          lines={state.lines}
          stations={state.stations}
          mode={state.mode}
          selectedLineId={state.selectedLineId}
          connectingFromId={state.connectingFromId}
          dispatch={dispatch}
          onCanvasAddStation={handleCanvasAddStation}
        />
      </main>

      <LineLegend
        lines={state.lines}
        selectedLineId={state.selectedLineId}
        dispatch={dispatch}
        onRenameLine={(lineId) => dispatch({ type: 'SHOW_LINE_MODAL', lineId })}
      />

      {state.stationModal && (
        <StationNameModal
          initialName={currentStation?.name ?? ''}
          isNew={state.stationModal === '__new__'}
          onConfirm={handleStationModalConfirm}
          onCancel={handleStationModalCancel}
        />
      )}

      {state.lineModal && (
        <LineNameModal
          initialName={currentLine?.name ?? ''}
          isNew={state.lineModal === '__new__'}
          usedColors={state.lines.map(l => l.color)}
          onConfirm={handleLineModalConfirm}
          onCancel={() => dispatch({ type: 'HIDE_LINE_MODAL' })}
        />
      )}
    </div>
  )
}
