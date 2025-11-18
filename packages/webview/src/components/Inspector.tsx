import React from 'react';
import { SerializedType } from '@typelens/shared';
import { TypeTree } from './TypeTree';
import { useTypeStore } from '../store/useTypeStore';
import { postMessageToExtension } from '../hooks/useVSCodeMessage';
import './Inspector.css';

interface InspectorProps {
  type: SerializedType;
}

export const Inspector: React.FC<InspectorProps> = ({ type }) => {
  const { searchQuery, setSearchQuery, expandAll, collapseAll } = useTypeStore();

  const handleCopyType = () => {
    postMessageToExtension({
      type: 'copyType',
      data: { typeString: type.displayName },
    });
  };

  const handleExpandAll = () => {
    expandAll();
  };

  const handleCollapseAll = () => {
    collapseAll();
  };

  return (
    <div className="inspector-container">
      <div className="inspector-header">
        <div className="inspector-title">
          <h1>Type Inspector</h1>
          {type.filePath && (
            <div className="inspector-location">
              <span className="location-icon">📍</span>
              <span className="location-path">{type.filePath}</span>
              {type.position && (
                <span className="location-position">
                  :{type.position.line + 1}:{type.position.character + 1}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="inspector-actions">
          <button onClick={handleExpandAll} className="action-button" title="Expand all">
            ⊞
          </button>
          <button onClick={handleCollapseAll} className="action-button" title="Collapse all">
            ⊟
          </button>
          <button onClick={handleCopyType} className="action-button" title="Copy type">
            📋
          </button>
        </div>
      </div>

      <div className="inspector-search">
        <input
          type="text"
          placeholder="Search in type..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="inspector-type-info">
        <div className="type-display-name">{type.displayName}</div>
      </div>

      <div className="inspector-content">
        <TypeTree node={type.typeNode} filePath={type.filePath} position={type.position} />
      </div>
    </div>
  );
};
