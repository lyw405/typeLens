import { create } from 'zustand';
import { SerializedType, TypeDiff } from '@typelens/shared';

export type ViewMode = 'inspector' | 'diff';

interface TypeState {
  // Current view mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Type inspector data
  currentType: SerializedType | null;
  setCurrentType: (type: SerializedType | null) => void;

  // Type diff data
  diffData: {
    expected: SerializedType;
    actual: SerializedType;
    diff: TypeDiff;
  } | null;
  setDiffData: (data: TypeState['diffData']) => void;

  // UI state
  expandedNodes: Set<string>;
  toggleNode: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useTypeStore = create<TypeState>(set => ({
  // View mode
  viewMode: 'inspector',
  setViewMode: mode => set({ viewMode: mode }),

  // Type data
  currentType: null,
  setCurrentType: type => set({ currentType: type }),

  diffData: null,
  setDiffData: data => set({ diffData: data, viewMode: 'diff' }),

  // Expanded nodes
  expandedNodes: new Set<string>(),
  toggleNode: nodeId =>
    set(state => {
      const newSet = new Set(state.expandedNodes);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return { expandedNodes: newSet };
    }),
  expandAll: () =>
    set(state => {
      const allNodeIds = new Set<string>();
      const collectNodeIds = (type: SerializedType | null) => {
        if (!type) return;
        allNodeIds.add(type.id);
        // Recursively collect all node IDs from children
        const traverse = (node: any) => {
          if (node?.children) {
            node.children.forEach((child: any) => {
              if (child?.name) allNodeIds.add(child.name);
              traverse(child);
            });
          }
        };
        traverse(type.typeNode);
      };
      collectNodeIds(state.currentType);
      return { expandedNodes: allNodeIds };
    }),
  collapseAll: () => set({ expandedNodes: new Set() }),

  // Search
  searchQuery: '',
  setSearchQuery: query => set({ searchQuery: query }),

  // Theme
  theme: 'dark',
  setTheme: theme => set({ theme }),
}));
