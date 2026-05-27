import { useState } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { PRESETS } from '../data/presets';
import { deleteDesign, loadAll, loadDesign, saveDesign } from '../lib/storage';

export default function Toolbar() {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const params = useDiagramStore((s) => s.params);
  const clearDiagram = useDiagramStore((s) => s.clearDiagram);
  const loadPreset = useDiagramStore((s) => s.loadPreset);
  const loadSnapshot = useDiagramStore((s) => s.loadSnapshot);

  const [saved, setSaved] = useState(() => loadAll());
  const [presetOpen, setPresetOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);

  const handleSave = () => {
    const name = window.prompt('Name this design:', `Design ${saved.length + 1}`);
    if (name == null) return;
    saveDesign(name, { nodes, edges, params });
    setSaved(loadAll());
  };

  const handleLoad = (id: string) => {
    const d = loadDesign(id);
    if (d) loadSnapshot(d);
    setLoadOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this saved design?')) return;
    deleteDesign(id);
    setSaved(loadAll());
  };

  const handleClear = () => {
    if (nodes.length === 0) return;
    if (!window.confirm('Clear the entire diagram?')) return;
    clearDiagram();
  };

  return (
    <div className="toolbar">
      <div className="toolbar__group">
        <div className="toolbar__menu">
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => {
              setPresetOpen((o) => !o);
              setLoadOpen(false);
            }}
          >
            Preset ▾
          </button>
          {presetOpen && (
            <div className="toolbar__dropdown">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="toolbar__option"
                  onClick={() => {
                    loadPreset(p.id);
                    setPresetOpen(false);
                  }}
                >
                  <div className="toolbar__option-name">{p.name}</div>
                  <div className="toolbar__option-desc">{p.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" className="btn btn--sm" onClick={handleSave}>
          Save
        </button>

        <div className="toolbar__menu">
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => {
              setLoadOpen((o) => !o);
              setPresetOpen(false);
            }}
            disabled={saved.length === 0}
          >
            Load ({saved.length}) ▾
          </button>
          {loadOpen && saved.length > 0 && (
            <div className="toolbar__dropdown">
              {saved.map((d) => (
                <div key={d.id} className="toolbar__saved-row">
                  <button
                    type="button"
                    className="toolbar__option toolbar__option--flex"
                    onClick={() => handleLoad(d.id)}
                  >
                    <div className="toolbar__option-name">{d.name}</div>
                    <div className="toolbar__option-desc">
                      {new Date(d.savedAt).toLocaleString()}
                    </div>
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    onClick={() => handleDelete(d.id)}
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="button" className="btn btn--danger btn--sm" onClick={handleClear}>
          Clear
        </button>
      </div>
    </div>
  );
}
