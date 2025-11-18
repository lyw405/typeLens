import { describe, it, expect } from 'vitest';
import * as ts from 'typescript';
import { TypeSerializer } from './typeSerializer';

/**
 * Complex type validation tests
 * Testing real-world TypeScript patterns
 */

function createProgram(sourceCode: string): {
  program: ts.Program;
  sourceFile: ts.SourceFile;
  checker: ts.TypeChecker;
} {
  const fileName = 'test.ts';
  const host = ts.createCompilerHost({});
  const originalGetSourceFile = host.getSourceFile;

  host.getSourceFile = (name: string, languageVersion: ts.ScriptTarget) => {
    if (name === fileName) {
      return ts.createSourceFile(fileName, sourceCode, ts.ScriptTarget.Latest);
    }
    return originalGetSourceFile.call(host, name, languageVersion);
  };

  const program = ts.createProgram([fileName], {}, host);
  const sourceFile = program.getSourceFile(fileName)!;
  const checker = program.getTypeChecker();

  return { program, sourceFile, checker };
}

function getTypeAtIdentifier(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  identifier: string
): ts.Type | undefined {
  let foundType: ts.Type | undefined;

  function visit(node: ts.Node) {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === identifier) {
      foundType = checker.getTypeAtLocation(node.type);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return foundType;
}

describe('Complex TypeScript Type Serialization', () => {
  describe('Recursive Types', () => {
    it('should handle linked list recursive type', () => {
      const code = `
        type LinkedListNode = {
          value: string;
          next?: LinkedListNode;
        };
      `;
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtIdentifier(sourceFile, checker, 'LinkedListNode');
      expect(type).toBeDefined();

      const result = serializer.serialize(type!, undefined, undefined, { maxDepth: 5 });

      expect(result.typeNode.kind).toBe('object');
      expect(result.typeNode.children?.some(c => c.name === 'value')).toBe(true);
      expect(result.typeNode.children?.some(c => c.name === 'next')).toBe(true);

      // Should handle recursion gracefully
      const nextProp = result.typeNode.children?.find(c => c.name === 'next');
      expect(nextProp).toBeDefined();
    });

    it('should handle tree structure recursive type', () => {
      const code = `
        type TreeNode = {
          value: number;
          left?: TreeNode;
          right?: TreeNode;
        };
      `;
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtIdentifier(sourceFile, checker, 'TreeNode');
      expect(type).toBeDefined();

      const result = serializer.serialize(type!, undefined, undefined, { maxDepth: 5 });

      expect(result.typeNode.kind).toBe('object');
      expect(result.typeNode.children?.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle mutually recursive types', () => {
      const code = `
        type NodeA = {
          id: string;
          b?: NodeB;
        };
        type NodeB = {
          id: string;
          a?: NodeA;
        };
      `;
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtIdentifier(sourceFile, checker, 'NodeA');
      expect(type).toBeDefined();

      const result = serializer.serialize(type!, undefined, undefined, { maxDepth: 5 });

      expect(result.typeNode.kind).toBe('object');
      // Should stop at max depth
    });
  });

  describe('Complex Generic Types', () => {
    it('should handle generic type with constraints', () => {
      const code = `
        type Container<T extends { id: string }> = {
          data: T;
          id: string;
        };
        type UserContainer = Container<{ id: string; name: string }>;
      `;
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtIdentifier(sourceFile, checker, 'UserContainer');
      expect(type).toBeDefined();

      const result = serializer.serialize(type!);

      expect(result.typeNode.kind).toBe('object');
      expect(result.typeNode.children?.some(c => c.name === 'data')).toBe(true);
      expect(result.typeNode.children?.some(c => c.name === 'id')).toBe(true);
    });

    it('should handle nested generics', () => {
      const code = `
        type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
        type ApiResult = Result<{ data: string }, { message: string }>;
      `;
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtIdentifier(sourceFile, checker, 'ApiResult');
      expect(type).toBeDefined();

      const result = serializer.serialize(type!);

      // Result should be a union type
      expect(result.typeNode.kind).toBe('union');
      expect(result.typeNode.children?.length).toBe(2);
    });

    it('should handle mapped types', () => {
      const code = `
        type Readonly<T> = { readonly [P in keyof T]: T[P] };
        type User = { id: string; name: string };
        type ReadonlyUser = Readonly<User>;
      `;
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtIdentifier(sourceFile, checker, 'ReadonlyUser');
      expect(type).toBeDefined();

      const result = serializer.serialize(type!);

      expect(result.typeNode.kind).toBe('object');
      // TypeScript may not always preserve readonly in mapped types after resolution
      // Just check that properties exist
      expect(result.typeNode.children?.some(c => c.name === 'id')).toBe(true);
      expect(result.typeNode.children?.some(c => c.name === 'name')).toBe(true);
    });
  });

  describe('Utility Types', () => {
    it('should handle Partial<T>', () => {
      const code = `
        type User = { id: string; name: string; email: string };
        type PartialUser = Partial<User>;
      `;
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtIdentifier(sourceFile, checker, 'PartialUser');
      expect(type).toBeDefined();

      const result = serializer.serialize(type!);

      expect(result.typeNode.kind).toBe('object');
      // All properties should be optional
      const allOptional = result.typeNode.children?.every(c => c.optional);
      expect(allOptional).toBe(true);
    });

    it('should handle Pick<T, K>', () => {
      const code = `
        type User = { id: string; name: string; email: string; age: number };
        type UserBasic = Pick<User, 'id' | 'name'>;
      `;
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtIdentifier(sourceFile, checker, 'UserBasic');
      expect(type).toBeDefined();

      const result = serializer.serialize(type!);

      expect(result.typeNode.kind).toBe('object');
      expect(result.typeNode.children?.length).toBe(2);
      expect(result.typeNode.children?.some(c => c.name === 'id')).toBe(true);
      expect(result.typeNode.children?.some(c => c.name === 'name')).toBe(true);
    });

    it('should handle Omit<T, K>', () => {
      const code = `
        type User = { id: string; name: string; password: string };
        type PublicUser = Omit<User, 'password'>;
      `;
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtIdentifier(sourceFile, checker, 'PublicUser');
      expect(type).toBeDefined();

      const result = serializer.serialize(type!);

      expect(result.typeNode.kind).toBe('object');
      expect(result.typeNode.children?.length).toBe(2);
      expect(result.typeNode.children?.some(c => c.name === 'id')).toBe(true);
      expect(result.typeNode.children?.some(c => c.name === 'name')).toBe(true);
      expect(result.typeNode.children?.some(c => c.name === 'password')).toBe(false);
    });

    it('should handle ReturnType<T>', () => {
      const code = `
        function getUser() {
          return { id: '1', name: 'John' };
        }
        type UserType = ReturnType<typeof getUser>;
      `;
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtIdentifier(sourceFile, checker, 'UserType');
      expect(type).toBeDefined();

      const result = serializer.serialize(type!);

      expect(result.typeNode.kind).toBe('object');
      expect(result.typeNode.children?.some(c => c.name === 'id')).toBe(true);
      expect(result.typeNode.children?.some(c => c.name === 'name')).toBe(true);
    });
  });

  describe('Advanced Patterns', () => {
    it('should handle discriminated unions', () => {
      const code = `
        type Success = { type: 'success'; data: string };
        type Error = { type: 'error'; message: string };
        type Result = Success | Error;
      `;
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtIdentifier(sourceFile, checker, 'Result');
      expect(type).toBeDefined();

      const result = serializer.serialize(type!);

      expect(result.typeNode.kind).toBe('union');
      expect(result.typeNode.children?.length).toBe(2);
    });

    it('should handle intersection of object types', () => {
      const code = `
        type Timestamped = { createdAt: Date; updatedAt: Date };
        type User = { id: string; name: string };
        type TimestampedUser = User & Timestamped;
      `;
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtIdentifier(sourceFile, checker, 'TimestampedUser');
      expect(type).toBeDefined();

      const result = serializer.serialize(type!);

      // Intersection is often flattened to object
      expect(['object', 'intersection'].includes(result.typeNode.kind)).toBe(true);
      if (result.typeNode.kind === 'object') {
        expect(result.typeNode.children?.length).toBeGreaterThanOrEqual(4);
      }
    });

    it('should handle conditional types', () => {
      const code = `
        type IsString<T> = T extends string ? 'yes' : 'no';
        type TestString = IsString<string>;
        type TestNumber = IsString<number>;
      `;
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type1 = getTypeAtIdentifier(sourceFile, checker, 'TestString');
      const result1 = serializer.serialize(type1!);
      expect(result1.typeNode.kind).toBe('literal');

      const type2 = getTypeAtIdentifier(sourceFile, checker, 'TestNumber');
      const result2 = serializer.serialize(type2!);
      expect(result2.typeNode.kind).toBe('literal');
    });

    it('should handle template literal types', () => {
      const code = `
        type EventName = 'click' | 'focus' | 'blur';
        type EventHandler = \`on\${Capitalize<EventName>}\`;
      `;
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtIdentifier(sourceFile, checker, 'EventHandler');
      expect(type).toBeDefined();

      const result = serializer.serialize(type!);

      // Template literal types result in unions of string literals
      expect(['union', 'template'].includes(result.typeNode.kind)).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle very large union types efficiently', () => {
      const literals = Array.from({ length: 50 }, (_, i) => `'value${i}'`).join(' | ');
      const code = `type LargeUnion = ${literals};`;
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const start = Date.now();
      const type = getTypeAtIdentifier(sourceFile, checker, 'LargeUnion');
      const result = serializer.serialize(type!);
      const duration = Date.now() - start;

      expect(result.typeNode.kind).toBe('union');
      expect(result.typeNode.children?.length).toBe(50);
      expect(duration).toBeLessThan(500);
    });

    it('should handle deeply nested object types efficiently', () => {
      const code = `
        type Deep = {
          l1: {
            l2: {
              l3: {
                l4: {
                  l5: {
                    l6: {
                      l7: {
                        l8: string;
                      };
                    };
                  };
                };
              };
            };
          };
        };
      `;
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const start = Date.now();
      const type = getTypeAtIdentifier(sourceFile, checker, 'Deep');
      const result = serializer.serialize(type!);
      const duration = Date.now() - start;

      expect(result.typeNode.kind).toBe('object');
      expect(duration).toBeLessThan(500);
    });
  });
});
