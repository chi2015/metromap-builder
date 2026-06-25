import { useMemo, useEffect, useState, useRef, useCallback } from 'react'
import { Stage, Layer, Line, Circle, Text, Group, Rect } from 'react-konva'

const GRID          = 20
const LINE_W        = 8
const ST_R          = 8
const ST_R_TERM     = 11
const ST_R_INTER    = 13
const ST_R_INTER_IN = 8
const BG            = '#F5F2E8'

const snap = v => Math.round(v / GRID) * GRID

function linePoints(stationIds, stationMap) {
  return stationIds.flatMap(id => {
    const s = stationMap.get(id)
    return s ? [s.x, s.y] : []
  })
}

function buildInterchangeSet(lines) {
  const counts = {}
  for (const line of lines)
    for (const id of line.stationIds)
      counts[id] = (counts[id] || 0) + 1
  const set = new Set()
  for (const [id, c] of Object.entries(counts))
    if (c >= 2) set.add(id)
  return set
}

function buildTerminalSet(lines) {
  const set = new Set()
  for (const line of lines) {
    if (line.stationIds.length > 0) {
      set.add(line.stationIds[0])
      set.add(line.stationIds[line.stationIds.length - 1])
    }
  }
  return set
}

function primaryColor(stationId, lines) {
  return lines.find(l => l.stationIds.includes(stationId))?.color ?? '#333'
}

function pillTextColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#000' : '#fff'
}

export default function MapCanvas({
  lines, stations, mode, selectedLineId, connectingFromId,
  dispatch, onCanvasAddStation,
}) {
  const stageRef     = useRef(null)
  const containerRef = useRef(null)
  const [hoveredId,   setHoveredId]   = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [stageSize,   setStageSize]   = useState({ width: window.innerWidth - 2, height: 580 })
  const [linePicker,  setLinePicker]  = useState(null)

  const stationMap     = useMemo(() => new Map(stations.map(s => [s.id, s])), [stations])
  const interchangeSet = useMemo(() => buildInterchangeSet(lines), [lines])
  const terminalSet    = useMemo(() => buildTerminalSet(lines), [lines])

  // Core auto-redraw: derive every line's pixel points from station coordinates.
  // React re-renders whenever stations/lines change → useMemo recomputes → Konva redraws.
  const linePointsMap = useMemo(() => {
    const map = new Map()
    for (const line of lines)
      map.set(line.id, linePoints(line.stationIds, stationMap))
    return map
  }, [lines, stationMap])

  useEffect(() => {
    function onResize() {
      if (containerRef.current)
        setStageSize({ width: containerRef.current.offsetWidth, height: 580 })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && linePicker) {
        setLinePicker(null)
        dispatch({ type: 'SET_CONNECTING_FROM', stationId: null })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [linePicker, dispatch])

  const closePicker = useCallback(() => {
    setLinePicker(null)
    dispatch({ type: 'SET_CONNECTING_FROM', stationId: null })
  }, [dispatch])

  const connectToLine = useCallback((lineId, fromId, toId) => {
    dispatch({ type: 'CONNECT_STATIONS', lineId, fromId, toId })
    dispatch({ type: 'SELECT_LINE', lineId })
    setLinePicker(null)
  }, [dispatch])

  const handleStageClick = useCallback((e) => {
    if (e.target !== e.target.getStage() && e.target.name() !== 'bg') return
    setContextMenu(null)
    if (linePicker) { closePicker(); return }
    if (mode !== 'addStation') return
    const pos = e.target.getStage().getPointerPosition()
    onCanvasAddStation(snap(pos.x), snap(pos.y))
  }, [mode, onCanvasAddStation, linePicker, closePicker])

  const handleStationClick = useCallback((e, stationId) => {
    e.cancelBubble = true
    setContextMenu(null)

    if (mode === 'select') {
      dispatch({ type: 'SHOW_STATION_MODAL', stationId })
      return
    }
    if (mode !== 'connect') return

    if (!connectingFromId) {
      dispatch({ type: 'SET_CONNECTING_FROM', stationId })
      return
    }

    if (connectingFromId === stationId) {
      dispatch({ type: 'SET_CONNECTING_FROM', stationId: null })
      return
    }

    const fromId = connectingFromId
    const toId   = stationId

    if (selectedLineId) {
      dispatch({ type: 'CONNECT_STATIONS', lineId: selectedLineId, fromId, toId })
    } else if (lines.length === 1) {
      dispatch({ type: 'CONNECT_STATIONS', lineId: lines[0].id, fromId, toId })
      dispatch({ type: 'SELECT_LINE', lineId: lines[0].id })
    } else if (lines.length === 0) {
      dispatch({ type: 'SET_CONNECTING_FROM', stationId: null })
    } else {
      const stage = e.target.getStage()
      const pos   = stage.getPointerPosition()
      setLinePicker({ fromId, toId, x: pos.x, y: pos.y })
    }
  }, [mode, connectingFromId, selectedLineId, lines, dispatch])

  const handleStationDragEnd = useCallback((e, stationId) => {
    dispatch({ type: 'MOVE_STATION_COMMIT', id: stationId, x: snap(e.target.x()), y: snap(e.target.y()) })
  }, [dispatch])

  const handleStationDragMove = useCallback((e, stationId) => {
    dispatch({ type: 'MOVE_STATION', id: stationId, x: e.target.x(), y: e.target.y() })
  }, [dispatch])

  const handleContextMenu = useCallback((e, stationId) => {
    e.evt.preventDefault()
    const pos = e.target.getStage().getPointerPosition()
    setContextMenu({ x: pos.x, y: pos.y, stationId })
  }, [])

  const closeContextMenu = () => setContextMenu(null)

  const cursor =
    mode === 'addStation' ? 'crosshair' :
    mode === 'connect'    ? 'cell' :
    'default'

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      style={{ cursor }}
      onContextMenu={e => e.preventDefault()}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onClick={handleStageClick}
        onContextMenu={closeContextMenu}
      >
        <Layer>
          <Rect name="bg" x={0} y={0} width={stageSize.width} height={stageSize.height} fill={BG} />

          {/* Route lines */}
          {lines.map(line => {
            const pts = linePointsMap.get(line.id) || []
            if (pts.length < 4) return null
            return (
              <Line
                key={line.id}
                points={pts}
                stroke={line.color}
                strokeWidth={LINE_W}
                lineCap="round"
                lineJoin="round"
                tension={0}
                opacity={selectedLineId && selectedLineId !== line.id ? 0.35 : 1}
              />
            )
          })}

          {/* Stations */}
          {stations.map(station => {
            const isInterchange = interchangeSet.has(station.id)
            const isTerminal    = terminalSet.has(station.id) && !isInterchange
            const isHovered     = hoveredId === station.id
            const isConnFrom    = connectingFromId === station.id
            const color         = primaryColor(station.id, lines)
            const draggable     = mode === 'select'

            return (
              <Group
                key={station.id}
                x={station.x}
                y={station.y}
                draggable={draggable}
                onDragMove={e => handleStationDragMove(e, station.id)}
                onDragEnd={e => handleStationDragEnd(e, station.id)}
                onClick={e => handleStationClick(e, station.id)}
                onContextMenu={e => handleContextMenu(e, station.id)}
                onMouseEnter={() => setHoveredId(station.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {isInterchange ? (
                  <>
                    <Circle radius={ST_R_INTER}    fill="white" stroke="black" strokeWidth={3} />
                    <Circle radius={ST_R_INTER_IN} fill="white" />
                  </>
                ) : isTerminal ? (
                  <Circle radius={ST_R_TERM} fill={color} stroke="white" strokeWidth={2.5} />
                ) : (
                  <Circle radius={ST_R} fill={color} stroke="white" strokeWidth={2} />
                )}

                {isConnFrom && (
                  <Circle radius={ST_R_INTER + 4} stroke="#FFD300" strokeWidth={3} fill="transparent" />
                )}

                {isHovered && !isConnFrom && (
                  <Circle
                    radius={(isInterchange ? ST_R_INTER : isTerminal ? ST_R_TERM : ST_R) + 4}
                    stroke="rgba(0,0,0,0.3)" strokeWidth={2} fill="transparent"
                  />
                )}

                <Text
                  text={station.name}
                  x={15} y={-6}
                  fontSize={12}
                  fontFamily="'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
                  fill="black"
                  shadowColor="white"
                  shadowBlur={4}
                  shadowOffset={{ x: 0, y: 0 }}
                />
              </Group>
            )
          })}
        </Layer>
      </Stage>

      {/* Floating line picker */}
      {linePicker && (
        <div className="line-picker" style={{ left: linePicker.x, top: linePicker.y }}>
          <p className="line-picker-title">Add to line:</p>
          {lines.map(line => (
            <button
              key={line.id}
              className="line-picker-btn"
              style={{ background: line.color, color: pillTextColor(line.color) }}
              onClick={() => connectToLine(line.id, linePicker.fromId, linePicker.toId)}
            >
              {line.name}
            </button>
          ))}
          <button className="line-picker-cancel" onClick={closePicker}>Cancel</button>
        </div>
      )}

      {/* Station right-click menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={closeContextMenu}
        >
          <button onClick={() => {
            dispatch({ type: 'SHOW_STATION_MODAL', stationId: contextMenu.stationId })
            closeContextMenu()
          }}>Rename</button>
          <button className="danger" onClick={() => {
            dispatch({ type: 'DELETE_STATION', id: contextMenu.stationId })
            closeContextMenu()
          }}>Delete</button>
        </div>
      )}

      {/* Mode hints */}
      {mode === 'addStation' && (
        <div className="mode-hint">Click anywhere on the map to place a new station</div>
      )}
      {mode === 'connect' && !connectingFromId && (
        <div className="mode-hint">Click the first station</div>
      )}
      {mode === 'connect' && connectingFromId && !linePicker && (
        <div className="mode-hint">Click the second station — Esc to cancel</div>
      )}
    </div>
  )
}
