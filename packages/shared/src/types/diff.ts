/**
 * Type difference result
 */
export interface TypeDiff {
  path: string[];
  kind: DiffKind;
  expected?: string;
  actual?: string;
  message: string;
  changes?: TypeDiffChange[];
}

export interface TypeDiffChange {
  path: string;
  kind: DiffKind;
  message: string;
  expected?: string;
  actual?: string;
}

export enum DiffKind {
  Missing = 'missing',
  Extra = 'extra',
  TypeMismatch = 'type-mismatch',
  ValueMismatch = 'value-mismatch',
  Modified = 'modified',
  Added = 'added',
  Removed = 'removed',
  Identical = 'identical',
}

/**
 * Complete diff result
 */
export interface DiffResult {
  diffs: TypeDiff[];
  hasChanges: boolean;
  summary: DiffSummary;
}

export interface DiffSummary {
  missing: number;
  extra: number;
  mismatch: number;
}
