import { useState } from 'react'

// Determines whether to use white or black text based on the background colour
// so that all line labels remain legible (WCAG contrast heuristic)
function textColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Relative luminance (simplified)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.55 ? '#000' : '#fff'
}

export default function LineLegend({ lines, selectedLineId, dispatch, onRenameLine }) {
  const [contextMenu, setContextMenu] = useState(null) // { lineId, x, y }

  function selectLine(lineId) {
    dispatch({ type: 'SELECT_LINE', lineId: selectedLineId === lineId ? null : lineId })
  }

  function handleContextMenu(e, lineId) {
    e.preventDefault()
    setContextMenu({ lineId, x: e.clientX, y: e.clientY })
  }

  function closeCtx() { setContextMenu(null) }

  if (lines.length === 0) {
    return (
      <div className="legend">
        <span className="legend-empty">No lines yet — click <strong>+ New Line</strong> to start</span>
      </div>
    )
  }

  return (
    <div className="legend" onClick={closeCtx}>
      <div className="legend-inner">
        {lines.map(line => {
          const isSelected = line.id === selectedLineId
          const fg = textColor(line.color)
          return (
            <div
              key={line.id}
              className={`legend-item ${isSelected ? 'legend-item--selected' : ''}`}
              style={{ '--line-color': line.color, '--line-text': fg }}
              onClick={e => { e.stopPropagation(); selectLine(line.id) }}
              onContextMenu={e => handleContextMenu(e, line.id)}
              title="Left-click to select · Right-click for options"
            >
              {/* Coloured pill — mimics the horizontal line bar on real Tube maps */}
              <span className="legend-pill" style={{ background: line.color, color: fg }}>
                {line.name}
              </span>
            </div>
          )
        })}
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y, position: 'fixed' }}
          onMouseLeave={closeCtx}
        >
          <button onClick={() => { onRenameLine(contextMenu.lineId); closeCtx() }}>Rename</button>
          <button className="danger" onClick={() => {
            if (window.confirm('Delete this line?')) {
              dispatch({ type: 'DELETE_LINE', id: contextMenu.lineId })
            }
            closeCtx()
          }}>Delete</button>
        </div>
      )}
    </div>
  )
}
