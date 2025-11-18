import React, { useMemo } from 'react';
import { TypeNode } from '@typelens/shared';
import { useTypeStore } from '../store/useTypeStore';
import { postMessageToExtension } from '../hooks/useVSCodeMessage';
import './TypeTree.css';

interface TypeTreeProps {
  node: TypeNode;
  path?: string;
  depth?: number;
  filePath?: string;
  position?: { line: number; character: number };
}

/**
 * Get icon for type kind
 */
function getTypeIcon(kind: TypeNode['kind']): string {
  const icons: Record<TypeNode['kind'], string> = {
    primitive: '🔤',
    literal: '💎',
    object: '📦',
    array: '📋',
    tuple: '📐',
    union: '⚡',
    intersection: '🔀',
    function: '⚙️',
    class: '🏛️',
    interface: '📄',
    enum: '🎯',
    generic: '🧬',
    conditional: '❓',
    mapped: '🗺️',
    template: '📝',
    indexed: '🔍',
    unknown: '❔',
  };
  return icons[kind] || '❔';
}

/**
 * Get color for type kind
 */
function getTypeColor(kind: TypeNode['kind']): string {
  const colors: Record<TypeNode['kind'], string> = {
    primitive: 'var(--vscode-terminal-ansiCyan)',
    literal: 'var(--vscode-terminal-ansiGreen)',
    object: 'var(--vscode-terminal-ansiBlue)',
    array: 'var(--vscode-terminal-ansiMagenta)',
    tuple: 'var(--vscode-terminal-ansiMagenta)',
    union: 'var(--vscode-terminal-ansiYellow)',
    intersection: 'var(--vscode-terminal-ansiYellow)',
    function: 'var(--vscode-terminal-ansiBlue)',
    class: 'var(--vscode-terminal-ansiBlue)',
    interface: 'var(--vscode-terminal-ansiBlue)',
    enum: 'var(--vscode-terminal-ansiGreen)',
    generic: 'var(--vscode-terminal-ansiCyan)',
    conditional: 'var(--vscode-terminal-ansiYellow)',
    mapped: 'var(--vscode-terminal-ansiMagenta)',
    template: 'var(--vscode-terminal-ansiGreen)',
    indexed: 'var(--vscode-terminal-ansiCyan)',
    unknown: 'var(--vscode-errorForeground)',
  };
  return colors[kind] || 'var(--vscode-foreground)';
}

/**
 * Format type node for display
 */
function formatTypeNode(node: TypeNode): string {
  if (node.name) {
    return node.name;
  }

  switch (node.kind) {
    case 'primitive':
    case 'unknown':
      return node.name || node.kind;
    case 'literal':
      return typeof node.value === 'string' ? `"${node.value}"` : String(node.value);
    case 'array':
      return 'Array';
    case 'tuple':
      return 'Tuple';
    case 'union':
      return 'Union';
    case 'intersection':
      return 'Intersection';
    case 'function':
      return 'Function';
    case 'object':
      return 'Object';
    default:
      return node.kind;
  }
}

export const TypeTree: React.FC<TypeTreeProps> = ({
  node,
  path = '',
  depth = 0,
  filePath,
  position,
}) => {
  const { expandedNodes, toggleNode, searchQuery } = useTypeStore();
  const nodeId = path || 'root';
  const isExpanded = expandedNodes.has(nodeId);
  const hasChildren = node.children && node.children.length > 0;

  // Filter logic based on search
  const matchesSearch = useMemo(() => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const nodeName = formatTypeNode(node).toLowerCase();
    return nodeName.includes(query);
  }, [node, searchQuery]);

  if (!matchesSearch) {
    return null;
  }

  const handleClick = () => {
    if (hasChildren) {
      toggleNode(nodeId);
    }
  };

  const handleJumpToDefinition = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (filePath && position) {
      postMessageToExtension({
        type: 'jumpToDefinition',
        data: { filePath, position },
      });
    }
  };

  const icon = getTypeIcon(node.kind);
  const color = getTypeColor(node.kind);
  const displayName = formatTypeNode(node);

  return (
    <div className="type-tree-node" style={{ paddingLeft: `${depth * 16}px` }}>
      <div className="type-tree-node-content" onClick={handleClick}>
        {hasChildren && (
          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span className="expand-icon-placeholder" />}
        <span className="type-icon">{icon}</span>
        <span className="type-name" style={{ color }}>
          {displayName}
        </span>
        {node.optional && <span className="type-optional">?</span>}
        {node.readonly && <span className="type-readonly">readonly</span>}
        {node.value !== undefined && node.kind === 'literal' && (
          <span className="type-value"> = {JSON.stringify(node.value)}</span>
        )}
        {filePath && position && (
          <button
            className="jump-to-definition"
            onClick={handleJumpToDefinition}
            title="Jump to definition"
          >
            →
          </button>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div className="type-tree-children">
          {node.children!.map((child, index) => (
            <TypeTree
              key={`${nodeId}-${index}`}
              node={child}
              path={`${nodeId}.${child.name || index}`}
              depth={depth + 1}
              filePath={filePath}
              position={position}
            />
          ))}
        </div>
      )}
    </div>
  );
};
