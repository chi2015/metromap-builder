import { useState, useEffect, useRef } from 'react'

export default function StationNameModal({ initialName, isNew, onConfirm, onCancel }) {
  const [name, setName] = useState(initialName)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.select()
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    onConfirm(trimmed || (isNew ? 'New Station' : initialName))
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{isNew ? 'Name this station' : 'Rename station'}</h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="modal-input"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Station name"
            autoFocus
          />
          <div className="modal-actions">
            <button type="button" className="modal-btn secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="modal-btn primary">
              {isNew ? 'Add Station' : 'Rename'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
