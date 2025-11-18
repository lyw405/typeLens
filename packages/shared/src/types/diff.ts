/**
 * Type difference result
 */
export interface TypeDiff {
  path: string[];
  kind: DiffKind;
  expected?: string;
  actual?: string;
  message: string;
}

export enum DiffKind {
  Missing = 'missing',
  Extra = 'extra',
  TypeMismatch = 'type-mismatch',
  ValueMismatch = 'value-mismatch',
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
