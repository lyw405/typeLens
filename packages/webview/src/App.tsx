import React, { useEffect } from 'react';
import { Inspector } from './components/Inspector';
import { TypeDiff } from './components/TypeDiff';
import { useTypeStore } from './store/useTypeStore';
import { useVSCodeMessage } from './hooks/useVSCodeMessage';
import { ExtensionMessage } from './types/messages';
import './App.css';

export const App: React.FC = () => {
  const { viewMode, currentType, diffData, setCurrentType, setDiffData, setTheme } = useTypeStore();

  // Handle messages from extension
  useVSCodeMessage((message: ExtensionMessage) => {
    switch (message.type) {
      case 'showType':
        setCurrentType(message.data);
        break;
      case 'showDiff':
        setDiffData({
          expected: message.data.expected,
          actual: message.data.actual,
          diff: message.data.diff,
        });
        break;
      case 'updateTheme':
        setTheme(message.data.theme);
        break;
      case 'error':
        console.error('Extension error:', message.data.message);
        break;
    }
  });

  // Detect VS Code theme changes
  useEffect(() => {
    const body = document.body;
    const observer = new MutationObserver(() => {
      const isDark = body.classList.contains('vscode-dark');
      setTheme(isDark ? 'dark' : 'light');
    });

    observer.observe(body, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [setTheme]);

  if (viewMode === 'diff' && diffData) {
    return <TypeDiff expected={diffData.expected} actual={diffData.actual} diff={diffData.diff} />;
  }

  if (viewMode === 'inspector' && currentType) {
    return <Inspector type={currentType} />;
  }

  // Empty state
  return (
    <div className="empty-state">
      <div className="empty-state-icon">🔍</div>
      <h2>TypeLens</h2>
      <p>Right-click on a type and select "Inspect Type" to get started</p>
    </div>
  );
};
