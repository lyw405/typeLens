import { Position } from './common';

/**
 * Enhanced diagnostic information
 */
export interface TypeDiagnostic {
  message: string;
  severity: DiagnosticSeverity;
  filePath: string;
  range: Range;
  code?: string | number;
  expectedType?: string;
  actualType?: string;
}

export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3,
}

export interface Range {
  start: Position;
  end: Position;
}
