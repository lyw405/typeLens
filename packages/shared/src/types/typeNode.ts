import { Position } from './common';

/**
 * Base type node structure for representing TypeScript types
 */
export interface TypeNode {
  kind: TypeKind;
  name?: string;
  value?: string | number | boolean;
  children?: TypeNode[];
  optional?: boolean;
  readonly?: boolean;
}

export type TypeKind =
  | 'primitive'
  | 'object'
  | 'array'
  | 'union'
  | 'intersection'
  | 'literal'
  | 'function'
  | 'generic'
  | 'tuple'
  | 'conditional'
  | 'template'
  | 'indexed'
  | 'mapped'
  | 'class'
  | 'interface'
  | 'enum'
  | 'unknown';

/**
 * Serialized type information
 */
export interface SerializedType {
  id: string;
  displayName: string;
  typeNode: TypeNode;
  filePath?: string;
  position?: Position;
}
