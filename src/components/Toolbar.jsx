export default function Toolbar({ mode, canUndo, canRedo, dispatch, onAddLine }) {
  const btn = (m, label) => (
    <button
      className={`tool-btn ${mode === m ? 'active' : ''}`}
      onClick={() => dispatch({ type: 'SET_MODE', mode: m })}
    >
      {label}
    </button>
  )

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        {btn('select',      'Select')}
        {btn('addStation',  'Add Station')}
        {btn('connect',     'Connect')}
      </div>

      <div className="toolbar-group">
        <button className="tool-btn" onClick={onAddLine}>
          + New Line
        </button>
      </div>

      <div className="toolbar-group toolbar-history">
        <button className="tool-btn icon-btn" onClick={() => dispatch({ type: 'UNDO' })} disabled={!canUndo} title="Undo (Ctrl+Z)">
          ↩
        </button>
        <button className="tool-btn icon-btn" onClick={() => dispatch({ type: 'REDO' })} disabled={!canRedo} title="Redo (Ctrl+Y)">
          ↪
        </button>
      </div>

      <div className="toolbar-help">
        <span>Select: click to rename, drag to move</span>
        <span>Connect: pick a line → click stations to extend it</span>
      </div>
    </div>
  )
}
