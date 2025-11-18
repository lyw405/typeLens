import * as ts from 'typescript';
import { TypeNode, TypeKind, SerializedType, createId } from '@typelens/shared';

/**
 * TypeScript type serializer
 * Converts TypeScript types to serializable format
 */
export class TypeSerializer {
  constructor(private checker: ts.TypeChecker) {}

  /**
   * Serialize a TypeScript type at a given position
   */
  serialize(
    type: ts.Type,
    sourceFile?: ts.SourceFile,
    position?: ts.LineAndCharacter
  ): SerializedType {
    const typeNode = this.serializeType(type);
    const displayName = this.checker.typeToString(type);

    return {
      id: createId(),
      displayName,
      typeNode,
      filePath: sourceFile?.fileName,
      position: position ? { line: position.line, character: position.character } : undefined,
    };
  }

  /**
   * Serialize type to TypeNode structure
   */
  private serializeType(type: ts.Type, depth = 0, maxDepth = 10): TypeNode {
    // Prevent infinite recursion
    if (depth > maxDepth) {
      return { kind: 'unknown', name: '...' };
    }

    // Handle union types
    if (type.isUnion()) {
      return {
        kind: 'union',
        children: type.types.map(t => this.serializeType(t, depth + 1, maxDepth)),
      };
    }

    // Handle intersection types
    if (type.isIntersection()) {
      return {
        kind: 'intersection',
        children: type.types.map(t => this.serializeType(t, depth + 1, maxDepth)),
      };
    }

    // Handle string/number/boolean literal types
    if (type.isStringLiteral()) {
      return { kind: 'literal', value: type.value };
    }
    if (type.isNumberLiteral()) {
      return { kind: 'literal', value: type.value };
    }
    if (type.flags & ts.TypeFlags.BooleanLiteral) {
      const value = (type as any).intrinsicName === 'true';
      return { kind: 'literal', value };
    }

    // Handle primitive types
    if (type.flags & ts.TypeFlags.String) {
      return { kind: 'primitive', name: 'string' };
    }
    if (type.flags & ts.TypeFlags.Number) {
      return { kind: 'primitive', name: 'number' };
    }
    if (type.flags & ts.TypeFlags.Boolean) {
      return { kind: 'primitive', name: 'boolean' };
    }
    if (type.flags & ts.TypeFlags.Null) {
      return { kind: 'primitive', name: 'null' };
    }
    if (type.flags & ts.TypeFlags.Undefined) {
      return { kind: 'primitive', name: 'undefined' };
    }
    if (type.flags & ts.TypeFlags.Void) {
      return { kind: 'primitive', name: 'void' };
    }
    if (type.flags & ts.TypeFlags.Any) {
      return { kind: 'primitive', name: 'any' };
    }
    if (type.flags & ts.TypeFlags.Unknown) {
      return { kind: 'unknown', name: 'unknown' };
    }
    if (type.flags & ts.TypeFlags.Never) {
      return { kind: 'primitive', name: 'never' };
    }

    // Handle array types
    if (this.checker.isArrayType(type)) {
      const typeArgs = (type as ts.TypeReference).typeArguments;
      const elementType = typeArgs?.[0];
      return {
        kind: 'array',
        children: elementType ? [this.serializeType(elementType, depth + 1, maxDepth)] : [],
      };
    }

    // Handle tuple types
    if (this.checker.isTupleType(type)) {
      const typeArgs = (type as ts.TypeReference).typeArguments || [];
      return {
        kind: 'tuple',
        children: typeArgs.map(t => this.serializeType(t, depth + 1, maxDepth)),
      };
    }

    // Handle object types
    const properties = this.checker.getPropertiesOfType(type);
    if (properties.length > 0) {
      const children: TypeNode[] = [];

      for (const prop of properties) {
        const propType = this.checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration!);
        const isOptional = (prop.flags & ts.SymbolFlags.Optional) !== 0;
        const isReadonly =
          prop.valueDeclaration &&
          ts.getCombinedModifierFlags(prop.valueDeclaration as ts.Declaration) &
            ts.ModifierFlags.Readonly;

        children.push({
          ...this.serializeType(propType, depth + 1, maxDepth),
          name: prop.name,
          optional: isOptional,
          readonly: Boolean(isReadonly),
        });
      }

      return {
        kind: 'object',
        children,
      };
    }

    // Handle generic types
    if (type.aliasSymbol) {
      const typeArgs = type.aliasTypeArguments;
      if (typeArgs && typeArgs.length > 0) {
        return {
          kind: 'generic',
          name: type.aliasSymbol.name,
          children: typeArgs.map(t => this.serializeType(t, depth + 1, maxDepth)),
        };
      }
    }

    // Fallback: use type string
    const typeString = this.checker.typeToString(type);
    return {
      kind: 'unknown',
      name: typeString,
    };
  }
}
