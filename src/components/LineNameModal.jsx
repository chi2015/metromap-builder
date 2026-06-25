import { useState, useEffect, useRef } from 'react'
import { TUBE_COLORS } from '../constants'

// Returns white or black depending on which is more legible on the given hex bg
function textColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#000' : '#fff'
}

export default function LineNameModal({ initialName, isNew, usedColors = [], onConfirm, onCancel }) {
  const [name, setName] = useState(initialName)

  // Pre-select the first colour not already taken; fall back to the first in palette
  const defaultColor = TUBE_COLORS.find(c => !usedColors.includes(c.hex))?.hex ?? TUBE_COLORS[0].hex
  const [color, setColor] = useState(defaultColor)

  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.select()
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    onConfirm(trimmed || (isNew ? 'New Line' : initialName), color)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{isNew ? 'Add a new line' : 'Rename line'}</h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="modal-input"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && onCancel()}
            placeholder="Line name"
            autoFocus
          />

          {/* Colour picker — only shown when creating a new line */}
          {isNew && (
            <div className="color-picker">
              <p className="color-picker-label">Line colour</p>
              <div className="color-swatches">
                {TUBE_COLORS.map(({ hex, name: colorName }) => {
                  const selected = hex === color
                  return (
                    <button
                      key={hex}
                      type="button"
                      className={`swatch ${selected ? 'swatch--selected' : ''}`}
                      style={{ background: hex }}
                      title={colorName}
                      onClick={() => setColor(hex)}
                      aria-label={colorName}
                      aria-pressed={selected}
                    />
                  )
                })}
              </div>

              {/* Live preview of how the legend pill will look */}
              <div className="color-preview">
                <span
                  className="legend-pill"
                  style={{ background: color, color: textColor(color) }}
                >
                  {name.trim() || 'New Line'}
                </span>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="modal-btn secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="modal-btn primary">
              {isNew ? 'Add Line' : 'Rename'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
