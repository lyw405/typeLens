import { describe, it, expect } from 'vitest';
import { TypeDiffer } from './typeDiffer';
import { TypeNode, DiffKind } from '@typelens/shared';

describe('TypeDiffer', () => {
  const differ = new TypeDiffer();

  describe('primitive type comparison', () => {
    it('should detect no difference for identical primitive types', () => {
      const type1: TypeNode = { kind: 'primitive', name: 'string' };
      const type2: TypeNode = { kind: 'primitive', name: 'string' };

      const result = differ.compare(type1, type2);

      expect(result.hasChanges).toBe(false);
      expect(result.diffs).toHaveLength(0);
    });

    it('should detect primitive type mismatch', () => {
      const type1: TypeNode = { kind: 'primitive', name: 'string' };
      const type2: TypeNode = { kind: 'primitive', name: 'number' };

      const result = differ.compare(type1, type2);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs).toHaveLength(1);
      expect(result.diffs[0].kind).toBe(DiffKind.TypeMismatch);
      expect(result.diffs[0].expected).toBe('string');
      expect(result.diffs[0].actual).toBe('number');
    });
  });

  describe('literal type comparison', () => {
    it('should detect no difference for identical literals', () => {
      const type1: TypeNode = { kind: 'literal', value: 'hello' };
      const type2: TypeNode = { kind: 'literal', value: 'hello' };

      const result = differ.compare(type1, type2);

      expect(result.hasChanges).toBe(false);
      expect(result.diffs).toHaveLength(0);
    });

    it('should detect literal value mismatch', () => {
      const type1: TypeNode = { kind: 'literal', value: 'hello' };
      const type2: TypeNode = { kind: 'literal', value: 'world' };

      const result = differ.compare(type1, type2);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs).toHaveLength(1);
      expect(result.diffs[0].kind).toBe(DiffKind.ValueMismatch);
    });

    it('should detect number literal mismatch', () => {
      const type1: TypeNode = { kind: 'literal', value: 42 };
      const type2: TypeNode = { kind: 'literal', value: 43 };

      const result = differ.compare(type1, type2);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs[0].kind).toBe(DiffKind.ValueMismatch);
      expect(result.diffs[0].expected).toBe('42');
      expect(result.diffs[0].actual).toBe('43');
    });
  });

  describe('object type comparison', () => {
    it('should detect no difference for identical objects', () => {
      const type1: TypeNode = {
        kind: 'object',
        children: [
          { kind: 'primitive', name: 'id' },
          { kind: 'primitive', name: 'name' },
        ],
      };
      const type2: TypeNode = {
        kind: 'object',
        children: [
          { kind: 'primitive', name: 'id' },
          { kind: 'primitive', name: 'name' },
        ],
      };

      const result = differ.compare(type1, type2);

      expect(result.hasChanges).toBe(false);
    });

    it('should detect missing property', () => {
      const type1: TypeNode = {
        kind: 'object',
        children: [
          { kind: 'primitive', name: 'id' },
          { kind: 'primitive', name: 'name' },
        ],
      };
      const type2: TypeNode = {
        kind: 'object',
        children: [{ kind: 'primitive', name: 'id' }],
      };

      const result = differ.compare(type1, type2);

      expect(result.hasChanges).toBe(true);
      expect(result.summary.missing).toBe(1);
      expect(result.diffs[0].kind).toBe(DiffKind.Missing);
      expect(result.diffs[0].path).toEqual(['name']);
    });

    it('should detect extra property', () => {
      const type1: TypeNode = {
        kind: 'object',
        children: [{ kind: 'primitive', name: 'id' }],
      };
      const type2: TypeNode = {
        kind: 'object',
        children: [
          { kind: 'primitive', name: 'id' },
          { kind: 'primitive', name: 'email' },
        ],
      };

      const result = differ.compare(type1, type2);

      expect(result.hasChanges).toBe(true);
      expect(result.summary.extra).toBe(1);
      expect(result.diffs[0].kind).toBe(DiffKind.Extra);
      expect(result.diffs[0].path).toEqual(['email']);
    });

    it('should detect property type mismatch', () => {
      // Test with actual different primitive type names
      const type1: TypeNode = {
        kind: 'object',
        children: [
          { kind: 'primitive', name: 'number' }, // This represents the TYPE of 'age' property
        ],
      };

      const type2: TypeNode = {
        kind: 'object',
        children: [
          { kind: 'primitive', name: 'string' }, // Different TYPE for 'age' property
        ],
      };

      // Add property name as separate field - this is the key insight
      // The node itself describes the TYPE, name field can be the property name
      type1.children![0] = { kind: 'primitive', name: 'age' } as any;
      type2.children![0] = { kind: 'primitive', name: 'age' } as any;

      // Store the type info separately - actually let's use a nested object
      type1.children = [
        {
          kind: 'object',
          name: 'age',
          children: [{ kind: 'primitive', name: 'number' }],
        } as any,
      ];

      type2.children = [
        {
          kind: 'object',
          name: 'age',
          children: [{ kind: 'primitive', name: 'string' }],
        } as any,
      ];

      const result = differ.compare(type1, type2);

      // Two objects with same property name but different structure should show change
      expect(result.hasChanges).toBe(true);
    });

    it('should not report missing for optional property', () => {
      const type1: TypeNode = {
        kind: 'object',
        children: [
          { kind: 'primitive', name: 'id' },
          { kind: 'primitive', name: 'email', optional: true },
        ],
      };
      const type2: TypeNode = {
        kind: 'object',
        children: [{ kind: 'primitive', name: 'id' }],
      };

      const result = differ.compare(type1, type2);

      // Optional properties should not be reported as missing
      expect(result.summary.missing).toBe(0);
    });

    it('should handle nested objects', () => {
      const type1: TypeNode = {
        kind: 'object',
        children: [
          {
            kind: 'object',
            name: 'profile',
            children: [
              { kind: 'primitive', name: 'avatar' },
              { kind: 'primitive', name: 'bio' },
            ],
          },
        ],
      };
      const type2: TypeNode = {
        kind: 'object',
        children: [
          {
            kind: 'object',
            name: 'profile',
            children: [{ kind: 'primitive', name: 'avatar' }],
          },
        ],
      };

      const result = differ.compare(type1, type2);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs[0].path).toEqual(['profile', 'bio']);
    });
  });

  describe('array and tuple comparison', () => {
    it('should detect array element type mismatch', () => {
      const type1: TypeNode = {
        kind: 'array',
        children: [{ kind: 'primitive', name: 'string' }],
      };
      const type2: TypeNode = {
        kind: 'array',
        children: [{ kind: 'primitive', name: 'number' }],
      };

      const result = differ.compare(type1, type2);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs[0].kind).toBe(DiffKind.TypeMismatch);
    });

    it('should detect tuple length mismatch', () => {
      const type1: TypeNode = {
        kind: 'tuple',
        children: [
          { kind: 'primitive', name: 'string' },
          { kind: 'primitive', name: 'number' },
        ],
      };
      const type2: TypeNode = {
        kind: 'tuple',
        children: [{ kind: 'primitive', name: 'string' }],
      };

      const result = differ.compare(type1, type2);

      expect(result.hasChanges).toBe(true);
      expect(result.summary.missing).toBe(1);
    });

    it('should detect tuple element type mismatch', () => {
      const type1: TypeNode = {
        kind: 'tuple',
        children: [
          { kind: 'primitive', name: 'string' },
          { kind: 'primitive', name: 'number' },
        ],
      };
      const type2: TypeNode = {
        kind: 'tuple',
        children: [
          { kind: 'primitive', name: 'string' },
          { kind: 'primitive', name: 'boolean' },
        ],
      };

      const result = differ.compare(type1, type2);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs[0].path).toEqual(['[1]']);
    });
  });

  describe('union and intersection comparison', () => {
    it('should detect union length mismatch', () => {
      const type1: TypeNode = {
        kind: 'union',
        children: [
          { kind: 'literal', value: 'a' },
          { kind: 'literal', value: 'b' },
          { kind: 'literal', value: 'c' },
        ],
      };
      const type2: TypeNode = {
        kind: 'union',
        children: [
          { kind: 'literal', value: 'a' },
          { kind: 'literal', value: 'b' },
        ],
      };

      const result = differ.compare(type1, type2);

      expect(result.hasChanges).toBe(true);
      // New behavior: detects specific missing type, not just length mismatch
      expect(result.diffs[0].kind).toBe(DiffKind.Missing);
      expect(result.diffs[0].expected).toBe('c');
    });

    it('should detect intersection length mismatch', () => {
      const type1: TypeNode = {
        kind: 'intersection',
        children: [
          { kind: 'primitive', name: 'A' },
          { kind: 'primitive', name: 'B' },
        ],
      };
      const type2: TypeNode = {
        kind: 'intersection',
        children: [{ kind: 'primitive', name: 'A' }],
      };

      const result = differ.compare(type1, type2);

      // New behavior: detects specific missing type
      expect(result.hasChanges).toBe(true);
      expect(result.diffs.length).toBe(1);
      expect(result.diffs[0].kind).toBe(DiffKind.Missing);
      expect(result.diffs[0].expected).toBe('B');
    });
  });

  describe('function type comparison', () => {
    it('should compare function signatures', () => {
      const type1: TypeNode = {
        kind: 'function',
        name: 'function',
        children: [
          { kind: 'primitive', name: 'id' },
          { kind: 'primitive', name: 'return' },
        ],
      };
      const type2: TypeNode = {
        kind: 'function',
        name: 'function',
        children: [
          { kind: 'primitive', name: 'id' },
          { kind: 'primitive', name: 'name' },
          { kind: 'primitive', name: 'return' },
        ],
      };

      const result = differ.compare(type1, type2);

      // Function comparison treats children as array, so extra element
      expect(result.hasChanges).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty objects', () => {
      const type1: TypeNode = { kind: 'object', children: [] };
      const type2: TypeNode = { kind: 'object', children: [] };

      const result = differ.compare(type1, type2);

      expect(result.hasChanges).toBe(false);
    });

    it('should handle types without children', () => {
      const type1: TypeNode = { kind: 'primitive', name: 'string' };
      const type2: TypeNode = { kind: 'primitive', name: 'string' };

      const result = differ.compare(type1, type2);

      expect(result.hasChanges).toBe(false);
    });

    it('should handle complex nested differences', () => {
      const type1: TypeNode = {
        kind: 'object',
        children: [
          {
            kind: 'object',
            name: 'user',
            children: [
              {
                kind: 'object',
                name: 'profile',
                children: [{ kind: 'primitive', name: 'email' }],
              },
            ],
          },
        ],
      };
      const type2: TypeNode = {
        kind: 'object',
        children: [
          {
            kind: 'object',
            name: 'user',
            children: [
              {
                kind: 'object',
                name: 'profile',
                children: [{ kind: 'primitive', name: 'phone' }],
              },
            ],
          },
        ],
      };

      const result = differ.compare(type1, type2);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs.length).toBeGreaterThan(0);
      expect(result.diffs.some(d => d.path.includes('profile'))).toBe(true);
    });
  });

  describe('summary statistics', () => {
    it('should provide accurate summary counts', () => {
      const type1: TypeNode = {
        kind: 'object',
        children: [
          { kind: 'primitive', name: 'id' },
          { kind: 'primitive', name: 'name' },
          { kind: 'primitive', name: 'age' },
        ],
      };
      const type2: TypeNode = {
        kind: 'object',
        children: [
          { kind: 'primitive', name: 'id' },
          { kind: 'primitive', name: 'email' },
        ],
      };

      const result = differ.compare(type1, type2);

      expect(result.summary.missing).toBe(2); // name, age
      expect(result.summary.extra).toBe(1); // email
      expect(result.summary.mismatch).toBe(0);
    });
  });

  describe('smart union/intersection comparison', () => {
    it('should detect missing type in union', () => {
      const type1: TypeNode = {
        kind: 'union',
        children: [
          { kind: 'literal', value: 'a' },
          { kind: 'literal', value: 'b' },
          { kind: 'literal', value: 'c' },
        ],
      };
      const type2: TypeNode = {
        kind: 'union',
        children: [
          { kind: 'literal', value: 'a' },
          { kind: 'literal', value: 'b' },
        ],
      };

      const result = differ.compare(type1, type2);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs.length).toBe(1);
      expect(result.diffs[0].kind).toBe(DiffKind.Missing);
      expect(result.diffs[0].expected).toBe('c');
    });

    it('should detect extra type in union', () => {
      const type1: TypeNode = {
        kind: 'union',
        children: [
          { kind: 'literal', value: 'a' },
          { kind: 'literal', value: 'b' },
        ],
      };
      const type2: TypeNode = {
        kind: 'union',
        children: [
          { kind: 'literal', value: 'a' },
          { kind: 'literal', value: 'b' },
          { kind: 'literal', value: 'c' },
        ],
      };

      const result = differ.compare(type1, type2);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs.length).toBe(1);
      expect(result.diffs[0].kind).toBe(DiffKind.Extra);
      expect(result.diffs[0].actual).toBe('c');
    });

    it('should detect both missing and extra types', () => {
      const type1: TypeNode = {
        kind: 'union',
        children: [
          { kind: 'literal', value: 'a' },
          { kind: 'literal', value: 'b' },
          { kind: 'literal', value: 'c' },
        ],
      };
      const type2: TypeNode = {
        kind: 'union',
        children: [
          { kind: 'literal', value: 'a' },
          { kind: 'literal', value: 'd' },
          { kind: 'literal', value: 'e' },
        ],
      };

      const result = differ.compare(type1, type2);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs.length).toBe(4); // missing: b, c; extra: d, e
      const missing = result.diffs.filter(d => d.kind === DiffKind.Missing);
      const extra = result.diffs.filter(d => d.kind === DiffKind.Extra);
      expect(missing.length).toBe(2);
      expect(extra.length).toBe(2);
    });

    it('should handle intersection types', () => {
      const type1: TypeNode = {
        kind: 'intersection',
        children: [
          { kind: 'primitive', name: 'A' },
          { kind: 'primitive', name: 'B' },
        ],
      };
      const type2: TypeNode = {
        kind: 'intersection',
        children: [
          { kind: 'primitive', name: 'A' },
          { kind: 'primitive', name: 'C' },
        ],
      };

      const result = differ.compare(type1, type2);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs.length).toBe(2); // missing: B, extra: C
    });
  });

  describe('utility methods', () => {
    it('should format path correctly', () => {
      expect(differ.formatPath([])).toBe('root');
      expect(differ.formatPath(['user'])).toBe('user');
      expect(differ.formatPath(['user', 'profile', 'email'])).toBe('user.profile.email');
    });

    it('should filter diffs by kind', () => {
      const type1: TypeNode = {
        kind: 'object',
        children: [
          { kind: 'primitive', name: 'id' },
          { kind: 'primitive', name: 'name' },
        ],
      };
      const type2: TypeNode = {
        kind: 'object',
        children: [
          { kind: 'primitive', name: 'id' },
          { kind: 'primitive', name: 'email' },
        ],
      };

      const result = differ.compare(type1, type2);
      const missing = differ.filterDiffs(result, DiffKind.Missing);
      const extra = differ.filterDiffs(result, DiffKind.Extra);

      expect(missing.length).toBe(1);
      expect(extra.length).toBe(1);
      expect(missing[0].path).toEqual(['name']);
      expect(extra[0].path).toEqual(['email']);
    });
  });
});
