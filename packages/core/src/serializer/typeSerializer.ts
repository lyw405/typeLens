import * as ts from 'typescript';
import { TypeNode, TypeKind, SerializedType, createId } from '@typelens/shared';

/**
 * Options for type serialization
 */
export interface SerializationOptions {
  maxDepth?: number;
  includeSignatures?: boolean;
  expandAliases?: boolean;
}

/**
 * Cache for tracking recursive types
 */
interface TypeCache {
  seen: Set<ts.Type>;
  depth: Map<ts.Type, number>;
}

/**
 * TypeScript type serializer
 * Converts TypeScript types to serializable format
 */
export class TypeSerializer {
  private cache: TypeCache = {
    seen: new Set(),
    depth: new Map(),
  };

  constructor(private checker: ts.TypeChecker) {}

  /**
   * Serialize a TypeScript type at a given position
   */
  serialize(
    type: ts.Type,
    sourceFile?: ts.SourceFile,
    position?: ts.LineAndCharacter,
    options?: SerializationOptions
  ): SerializedType {
    // Reset cache for new serialization
    this.cache = {
      seen: new Set(),
      depth: new Map(),
    };

    const maxDepth = options?.maxDepth ?? 10;
    const typeNode = this.serializeType(type, 0, maxDepth, options);
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
  private serializeType(
    type: ts.Type,
    depth = 0,
    maxDepth = 10,
    options?: SerializationOptions
  ): TypeNode {
    // Prevent infinite recursion
    if (depth > maxDepth) {
      return { kind: 'unknown', name: '...' };
    }

    // Check for circular references
    if (this.cache.seen.has(type)) {
      const seenDepth = this.cache.depth.get(type) ?? 0;
      if (depth - seenDepth > 2) {
        return { kind: 'unknown', name: '[Circular]' };
      }
    }

    this.cache.seen.add(type);
    this.cache.depth.set(type, depth);

    // Handle union types
    if (type.isUnion()) {
      return {
        kind: 'union',
        children: type.types.map(t => this.serializeType(t, depth + 1, maxDepth, options)),
      };
    }

    // Handle intersection types
    if (type.isIntersection()) {
      return {
        kind: 'intersection',
        children: type.types.map(t => this.serializeType(t, depth + 1, maxDepth, options)),
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
        children: elementType
          ? [this.serializeType(elementType, depth + 1, maxDepth, options)]
          : [],
      };
    }

    // Handle tuple types
    if (this.checker.isTupleType(type)) {
      const typeArgs = (type as ts.TypeReference).typeArguments || [];
      return {
        kind: 'tuple',
        children: typeArgs.map(t => this.serializeType(t, depth + 1, maxDepth, options)),
      };
    }

    // Handle function types
    if (this.isFunctionType(type)) {
      return this.serializeFunctionType(type, depth, maxDepth, options);
    }

    // Handle conditional types
    if (this.isConditionalType(type)) {
      return this.serializeConditionalType(type, depth, maxDepth, options);
    }

    // Handle template literal types
    if (this.isTemplateLiteralType(type)) {
      return this.serializeTemplateLiteralType(type);
    }

    // Handle index access types
    if (this.isIndexedAccessType(type)) {
      return this.serializeIndexedAccessType(type, depth, maxDepth, options);
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
          ...this.serializeType(propType, depth + 1, maxDepth, options),
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
          children: typeArgs.map(t => this.serializeType(t, depth + 1, maxDepth, options)),
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

  /**
   * Check if type is a function type
   */
  private isFunctionType(type: ts.Type): boolean {
    return type.getCallSignatures().length > 0;
  }

  /**
   * Serialize function type
   */
  private serializeFunctionType(
    type: ts.Type,
    depth: number,
    maxDepth: number,
    options?: SerializationOptions
  ): TypeNode {
    const signatures = type.getCallSignatures();
    if (signatures.length === 0) {
      return { kind: 'unknown', name: 'function' };
    }

    const signature = signatures[0]; // Take first signature
    const parameters = signature.getParameters();
    const returnType = signature.getReturnType();

    const paramNodes: TypeNode[] = parameters.map(param => {
      const paramType = this.checker.getTypeOfSymbolAtLocation(param, param.valueDeclaration!);
      const isOptional = (param.flags & ts.SymbolFlags.Optional) !== 0;
      return {
        ...this.serializeType(paramType, depth + 1, maxDepth, options),
        name: param.name,
        optional: isOptional,
      };
    });

    const returnNode = this.serializeType(returnType, depth + 1, maxDepth, options);

    return {
      kind: 'function',
      name: 'function',
      children: [...paramNodes, { ...returnNode, name: 'return' }],
    };
  }

  /**
   * Check if type is a conditional type
   */
  private isConditionalType(type: ts.Type): boolean {
    return !!(type.flags & ts.TypeFlags.Conditional);
  }

  /**
   * Serialize conditional type (T extends U ? X : Y)
   */
  private serializeConditionalType(
    type: ts.Type,
    depth: number,
    maxDepth: number,
    options?: SerializationOptions
  ): TypeNode {
    // TypeScript doesn't expose conditional type structure easily
    // Fall back to string representation
    return {
      kind: 'conditional',
      name: this.checker.typeToString(type),
    };
  }

  /**
   * Check if type is a template literal type
   */
  private isTemplateLiteralType(type: ts.Type): boolean {
    return !!(type.flags & ts.TypeFlags.TemplateLiteral);
  }

  /**
   * Serialize template literal type
   */
  private serializeTemplateLiteralType(type: ts.Type): TypeNode {
    return {
      kind: 'template',
      name: this.checker.typeToString(type),
    };
  }

  /**
   * Check if type is an indexed access type
   */
  private isIndexedAccessType(type: ts.Type): boolean {
    return !!(type.flags & ts.TypeFlags.IndexedAccess);
  }

  /**
   * Serialize indexed access type (T[K])
   */
  private serializeIndexedAccessType(
    type: ts.Type,
    depth: number,
    maxDepth: number,
    options?: SerializationOptions
  ): TypeNode {
    return {
      kind: 'indexed',
      name: this.checker.typeToString(type),
    };
  }
}
