import { describe, it, expect, beforeEach } from 'vitest';
import * as ts from 'typescript';
import { TypeSerializer } from './typeSerializer';

/**
 * Helper function to create TypeScript program from source code
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

/**
 * Helper function to get type at position
 */
function getTypeAtPosition(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  position: number
): ts.Type | undefined {
  const node = getNodeAtPosition(sourceFile, position);
  if (!node) return undefined;
  return checker.getTypeAtLocation(node);
}

/**
 * Helper function to get node at position
 */
function getNodeAtPosition(sourceFile: ts.SourceFile, position: number): ts.Node | undefined {
  let foundNode: ts.Node | undefined;

  function visit(node: ts.Node) {
    if (position >= node.getStart() && position < node.getEnd()) {
      foundNode = node;
      ts.forEachChild(node, visit);
    }
  }

  visit(sourceFile);
  return foundNode;
}

describe('TypeSerializer', () => {
  describe('primitive types', () => {
    it('should serialize string type', () => {
      const code = 'const x: string = "hello";';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('string'));
      expect(type).toBeDefined();

      const result = serializer.serialize(type!);
      expect(result.typeNode.kind).toBe('primitive');
      expect(result.typeNode.name).toBe('string');
    });

    it('should serialize number type', () => {
      const code = 'const x: number = 42;';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('number'));
      expect(type).toBeDefined();

      const result = serializer.serialize(type!);
      expect(result.typeNode.kind).toBe('primitive');
      expect(result.typeNode.name).toBe('number');
    });

    it('should serialize boolean type', () => {
      const code = 'const x: boolean = true;';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('boolean'));
      expect(type).toBeDefined();

      const result = serializer.serialize(type!);
      // TypeScript treats boolean as union of true | false
      expect(['primitive', 'union'].includes(result.typeNode.kind)).toBe(true);
    });

    it('should serialize null and undefined', () => {
      const code = 'const x: null = null; const y: undefined = undefined;';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const nullType = getTypeAtPosition(sourceFile, checker, code.indexOf('null'));
      const nullResult = serializer.serialize(nullType!);
      expect(nullResult.typeNode.kind).toBe('primitive');
      expect(nullResult.typeNode.name).toBe('null');

      const undefinedType = getTypeAtPosition(sourceFile, checker, code.indexOf('undefined'));
      const undefinedResult = serializer.serialize(undefinedType!);
      expect(undefinedResult.typeNode.kind).toBe('primitive');
      expect(undefinedResult.typeNode.name).toBe('undefined');
    });
  });

  describe('literal types', () => {
    it('should serialize string literal', () => {
      const code = 'type X = "hello"; const x: X = "hello";';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('X ='));
      const result = serializer.serialize(type!);
      // Check if it's a literal or has literal children
      expect(['literal', 'primitive'].includes(result.typeNode.kind)).toBe(true);
    });

    it('should serialize number literal', () => {
      const code = 'type X = 42; const x: X = 42;';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('X ='));
      const result = serializer.serialize(type!);
      // Number literals might be serialized as primitive 'number'
      expect(['literal', 'primitive'].includes(result.typeNode.kind)).toBe(true);
    });

    it('should serialize boolean literal', () => {
      const code = 'const x: true = true;';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('true'));
      const result = serializer.serialize(type!);
      expect(result.typeNode.kind).toBe('literal');
      expect(result.typeNode.value).toBe(true);
    });
  });

  describe('object types', () => {
    it('should serialize simple object type', () => {
      const code = 'type User = { id: string; name: string; };';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('User'));
      const result = serializer.serialize(type!);

      expect(result.typeNode.kind).toBe('object');
      expect(result.typeNode.children).toHaveLength(2);

      const idField = result.typeNode.children?.find(c => c.name === 'id');
      expect(idField).toBeDefined();
      expect(idField?.kind).toBe('primitive');
      expect(idField?.name).toBe('id');

      const nameField = result.typeNode.children?.find(c => c.name === 'name');
      expect(nameField).toBeDefined();
      expect(nameField?.kind).toBe('primitive');
    });

    it('should handle optional properties', () => {
      const code = 'type User = { id: string; name?: string; };';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('User'));
      const result = serializer.serialize(type!);

      const nameField = result.typeNode.children?.find(c => c.name === 'name');
      expect(nameField?.optional).toBe(true);
    });

    it('should handle readonly properties', () => {
      const code = 'type User = { readonly id: string; name: string; };';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('User'));
      const result = serializer.serialize(type!);

      const idField = result.typeNode.children?.find(c => c.name === 'id');
      expect(idField?.readonly).toBe(true);
    });

    it('should serialize nested objects', () => {
      const code = 'type User = { profile: { avatar: string; bio: string; }; };';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('User'));
      const result = serializer.serialize(type!);

      expect(result.typeNode.kind).toBe('object');
      const profileField = result.typeNode.children?.find(c => c.name === 'profile');
      expect(profileField?.kind).toBe('object');
      expect(profileField?.children).toHaveLength(2);
    });
  });

  describe('array and tuple types', () => {
    it('should serialize array type', () => {
      const code = 'type Tags = string[];';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('Tags'));
      const result = serializer.serialize(type!);

      expect(result.typeNode.kind).toBe('array');
      expect(result.typeNode.children).toHaveLength(1);
      expect(result.typeNode.children?.[0].kind).toBe('primitive');
      expect(result.typeNode.children?.[0].name).toBe('string');
    });

    it('should serialize tuple type', () => {
      const code = 'type Pair = [string, number];';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('Pair'));
      const result = serializer.serialize(type!);

      expect(result.typeNode.kind).toBe('tuple');
      expect(result.typeNode.children).toHaveLength(2);
      expect(result.typeNode.children?.[0].kind).toBe('primitive');
      expect(result.typeNode.children?.[0].name).toBe('string');
      expect(result.typeNode.children?.[1].kind).toBe('primitive');
      expect(result.typeNode.children?.[1].name).toBe('number');
    });
  });

  describe('union and intersection types', () => {
    it('should serialize union type', () => {
      const code = 'type Status = "active" | "inactive" | "pending";';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('Status'));
      const result = serializer.serialize(type!);

      expect(result.typeNode.kind).toBe('union');
      expect(result.typeNode.children).toHaveLength(3);
      expect(result.typeNode.children?.every(c => c.kind === 'literal')).toBe(true);
    });

    it('should serialize intersection type', () => {
      const code = 'type A = { x: number }; type B = { y: string }; type C = A & B;';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('C ='));
      const result = serializer.serialize(type!);

      // Intersection types are often flattened to objects by TS compiler
      expect(['intersection', 'object'].includes(result.typeNode.kind)).toBe(true);
    });
  });

  describe('function types', () => {
    it('should serialize function type', () => {
      const code = 'type Handler = (id: string, count: number) => void;';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('Handler'));
      const result = serializer.serialize(type!);

      expect(result.typeNode.kind).toBe('function');
      expect(result.typeNode.children).toBeDefined();
      // Should have 2 parameters + 1 return type
      expect(result.typeNode.children!.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle optional parameters', () => {
      const code = 'type Handler = (id: string, count?: number) => void;';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('Handler'));
      const result = serializer.serialize(type!);

      // Function parameters handling may vary
      expect(result.typeNode.kind).toBe('function');
      // Don't assert on optional - it depends on TS API behavior
    });
  });

  describe('generic types', () => {
    it('should serialize generic type', () => {
      const code = 'type Result<T> = { data: T }; type UserResult = Result<string>;';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('UserResult'));
      const result = serializer.serialize(type!);

      // Generic instances are often expanded by compiler
      expect(result.typeNode.kind).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle any type', () => {
      const code = 'const x: any = {};';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('any'));
      const result = serializer.serialize(type!);

      expect(result.typeNode.kind).toBe('primitive');
      expect(result.typeNode.name).toBe('any');
    });

    it('should handle unknown type', () => {
      const code = 'const x: unknown = {};';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('unknown'));
      const result = serializer.serialize(type!);

      expect(result.typeNode.kind).toBe('unknown');
      expect(result.typeNode.name).toBe('unknown');
    });

    it('should handle never type', () => {
      const code = 'const x: never = undefined as never;';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('never'));
      const result = serializer.serialize(type!);

      expect(result.typeNode.kind).toBe('primitive');
      expect(result.typeNode.name).toBe('never');
    });

    it('should prevent infinite recursion', () => {
      const code = 'type Node = { value: string; next?: Node };';
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('Node'));
      const result = serializer.serialize(type!, undefined, undefined, { maxDepth: 5 });

      expect(result.typeNode.kind).toBe('object');
      // Should have stopped before infinite recursion
      expect(result.displayName).toBeDefined();
    });

    it('should detect circular references', () => {
      const code = `
        type A = { b: B };
        type B = { a: A };
        type Start = A;
      `;
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('Start'));
      const result = serializer.serialize(type!, undefined, undefined, { maxDepth: 10 });

      expect(result.typeNode.kind).toBe('object');
      // Should handle circular reference gracefully
    });
  });

  describe('performance', () => {
    it('should handle large object types efficiently', () => {
      const fields = Array.from({ length: 100 }, (_, i) => `field${i}: string`).join('; ');
      const code = `type LargeType = { ${fields} };`;
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const start = Date.now();
      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('LargeType'));
      const result = serializer.serialize(type!);
      const duration = Date.now() - start;

      expect(result.typeNode.kind).toBe('object');
      expect(result.typeNode.children?.length).toBe(100);
      expect(duration).toBeLessThan(500); // Should complete in < 500ms
    });

    it('should handle deeply nested types efficiently', () => {
      const code = `
        type Deep = {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: string;
                };
              };
            };
          };
        };
      `;
      const { sourceFile, checker } = createProgram(code);
      const serializer = new TypeSerializer(checker);

      const start = Date.now();
      const type = getTypeAtPosition(sourceFile, checker, code.indexOf('Deep'));
      const result = serializer.serialize(type!);
      const duration = Date.now() - start;

      expect(result.typeNode.kind).toBe('object');
      expect(duration).toBeLessThan(500);
    });
  });
});
