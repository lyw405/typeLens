import React, { useState } from 'react';
import { SerializedType, TypeDiff as TypeDiffData, DiffKind } from '@typelens/shared';
import { TypeTree } from './TypeTree';
import './TypeDiff.css';

interface TypeDiffProps {
  expected: SerializedType;
  actual: SerializedType;
  diff: TypeDiffData;
}

/**
 * Get diff icon for diff kind
 */
function getDiffIcon(kind: DiffKind): string {
  const icons: Partial<Record<DiffKind, string>> = {
    [DiffKind.Identical]: '✓',
    [DiffKind.Modified]: '⚠️',
    [DiffKind.Added]: '➕',
    [DiffKind.Removed]: '❌',
    [DiffKind.Missing]: '❌',
    [DiffKind.Extra]: '➕',
    [DiffKind.TypeMismatch]: '⚠️',
    [DiffKind.ValueMismatch]: '⚠️',
  };
  return icons[kind] || '❔';
}

/**
 * Get diff color for diff kind
 */
function getDiffColor(kind: DiffKind): string {
  const colors: Partial<Record<DiffKind, string>> = {
    [DiffKind.Identical]: 'var(--vscode-terminal-ansiGreen)',
    [DiffKind.Modified]: 'var(--vscode-terminal-ansiYellow)',
    [DiffKind.Added]: 'var(--vscode-terminal-ansiCyan)',
    [DiffKind.Removed]: 'var(--vscode-errorForeground)',
    [DiffKind.Missing]: 'var(--vscode-errorForeground)',
    [DiffKind.Extra]: 'var(--vscode-terminal-ansiCyan)',
    [DiffKind.TypeMismatch]: 'var(--vscode-terminal-ansiYellow)',
    [DiffKind.ValueMismatch]: 'var(--vscode-terminal-ansiYellow)',
  };
  return colors[kind] || 'var(--vscode-foreground)';
}

/**
 * Render diff summary
 */
const DiffSummary: React.FC<{ diff: TypeDiffData }> = ({ diff }) => {
  const changes = diff.changes || [];
  const modifications = changes.filter(
    c =>
      c.kind === DiffKind.Modified ||
      c.kind === DiffKind.TypeMismatch ||
      c.kind === DiffKind.ValueMismatch
  ).length;
  const additions = changes.filter(
    c => c.kind === DiffKind.Added || c.kind === DiffKind.Extra
  ).length;
  const removals = changes.filter(
    c => c.kind === DiffKind.Removed || c.kind === DiffKind.Missing
  ).length;

  return (
    <div className="diff-summary">
      <div className="diff-summary-item">
        <span className="diff-icon" style={{ color: getDiffColor(DiffKind.Modified) }}>
          {getDiffIcon(DiffKind.Modified)}
        </span>
        <span>{modifications} modified</span>
      </div>
      <div className="diff-summary-item">
        <span className="diff-icon" style={{ color: getDiffColor(DiffKind.Added) }}>
          {getDiffIcon(DiffKind.Added)}
        </span>
        <span>{additions} added</span>
      </div>
      <div className="diff-summary-item">
        <span className="diff-icon" style={{ color: getDiffColor(DiffKind.Removed) }}>
          {getDiffIcon(DiffKind.Removed)}
        </span>
        <span>{removals} removed</span>
      </div>
    </div>
  );
};

/**
 * Render diff changes list with navigation
 */
const DiffChangesList: React.FC<{ diff: TypeDiffData }> = ({ diff }) => {
  const changes = diff.changes || [];
  const [currentIndex, setCurrentIndex] = useState(0);

  if (changes.length === 0) {
    return (
      <div className="diff-no-changes">
        <span style={{ color: getDiffColor(DiffKind.Identical) }}>
          {getDiffIcon(DiffKind.Identical)} Types are identical
        </span>
      </div>
    );
  }

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : changes.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev < changes.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="diff-changes-list">
      <div className="diff-changes-header">
        <h3>Changes ({changes.length})</h3>
        <div className="diff-navigation">
          <button onClick={goToPrevious} title="Previous change (↑)">
            ↑
          </button>
          <span className="diff-counter">
            {currentIndex + 1} / {changes.length}
          </span>
          <button onClick={goToNext} title="Next change (↓)">
            ↓
          </button>
        </div>
      </div>
      {changes.map((change, index) => (
        <div
          key={index}
          className={`diff-change-item ${index === currentIndex ? 'diff-change-active' : ''}`}
          onClick={() => setCurrentIndex(index)}
        >
          <span className="diff-icon" style={{ color: getDiffColor(change.kind) }}>
            {getDiffIcon(change.kind)}
          </span>
          <span className="diff-path">{change.path}</span>
          <span className="diff-message">{change.message}</span>
          {change.expected && (
            <div className="diff-detail">
              <span className="diff-label">Expected:</span>
              <code>{change.expected}</code>
            </div>
          )}
          {change.actual && (
            <div className="diff-detail">
              <span className="diff-label">Actual:</span>
              <code>{change.actual}</code>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export const TypeDiff: React.FC<TypeDiffProps> = ({ expected, actual, diff }) => {
  return (
    <div className="type-diff-container">
      <DiffSummary diff={diff} />

      <div className="type-diff-panels">
        <div className="type-diff-panel">
          <div className="type-diff-panel-header">
            <h2>Expected</h2>
            <span className="type-display-name">{expected.displayName}</span>
          </div>
          <div className="type-diff-panel-content">
            <TypeTree
              node={expected.typeNode}
              filePath={expected.filePath}
              position={expected.position}
            />
          </div>
        </div>

        <div className="type-diff-divider" />

        <div className="type-diff-panel">
          <div className="type-diff-panel-header">
            <h2>Actual</h2>
            <span className="type-display-name">{actual.displayName}</span>
          </div>
          <div className="type-diff-panel-content">
            <TypeTree
              node={actual.typeNode}
              filePath={actual.filePath}
              position={actual.position}
            />
          </div>
        </div>
      </div>

      <DiffChangesList diff={diff} />
    </div>
  );
};
