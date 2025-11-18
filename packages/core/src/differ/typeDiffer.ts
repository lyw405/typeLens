import { TypeNode, TypeDiff, DiffKind, DiffResult } from '@typelens/shared';

/**
 * Type differ - compares two types and produces diff
 */
export class TypeDiffer {
  /**
   * Compare two type nodes and generate diff
   */
  compare(expected: TypeNode, actual: TypeNode, path: string[] = []): DiffResult {
    const diffs: TypeDiff[] = [];
    this.compareNodes(expected, actual, path, diffs);

    const summary = {
      missing: diffs.filter(d => d.kind === DiffKind.Missing).length,
      extra: diffs.filter(d => d.kind === DiffKind.Extra).length,
      mismatch: diffs.filter(
        d => d.kind === DiffKind.TypeMismatch || d.kind === DiffKind.ValueMismatch
      ).length,
    };

    return {
      diffs,
      hasChanges: diffs.length > 0,
      summary,
    };
  }

  /**
   * Recursively compare type nodes
   */
  private compareNodes(
    expected: TypeNode,
    actual: TypeNode,
    path: string[],
    diffs: TypeDiff[]
  ): void {
    // Check kind mismatch
    if (expected.kind !== actual.kind) {
      diffs.push({
        path,
        kind: DiffKind.TypeMismatch,
        expected: this.nodeToString(expected),
        actual: this.nodeToString(actual),
        message: `Type mismatch: expected ${expected.kind}, got ${actual.kind}`,
      });
      return;
    }

    // Compare based on kind
    switch (expected.kind) {
      case 'primitive':
      case 'unknown':
        if (expected.name !== actual.name) {
          diffs.push({
            path,
            kind: DiffKind.TypeMismatch,
            expected: expected.name,
            actual: actual.name,
            message: `Type name mismatch: expected ${expected.name}, got ${actual.name}`,
          });
        }
        break;

      case 'literal':
        if (expected.value !== actual.value) {
          diffs.push({
            path,
            kind: DiffKind.ValueMismatch,
            expected: String(expected.value),
            actual: String(actual.value),
            message: `Literal value mismatch: expected ${expected.value}, got ${actual.value}`,
          });
        }
        break;

      case 'object':
        this.compareObjects(expected, actual, path, diffs);
        break;

      case 'array':
      case 'tuple':
        this.compareArrays(expected, actual, path, diffs);
        break;

      case 'union':
      case 'intersection':
        this.compareComposites(expected, actual, path, diffs);
        break;

      case 'generic':
        if (expected.name !== actual.name) {
          diffs.push({
            path,
            kind: DiffKind.TypeMismatch,
            expected: expected.name,
            actual: actual.name,
            message: `Generic type mismatch: expected ${expected.name}, got ${actual.name}`,
          });
        }
        this.compareArrays(expected, actual, path, diffs);
        break;
    }
  }

  /**
   * Compare object type nodes
   */
  private compareObjects(
    expected: TypeNode,
    actual: TypeNode,
    path: string[],
    diffs: TypeDiff[]
  ): void {
    const expectedProps = new Map((expected.children || []).map(c => [c.name!, c]));
    const actualProps = new Map((actual.children || []).map(c => [c.name!, c]));

    // Check for missing properties
    for (const [name, expectedProp] of expectedProps) {
      if (!actualProps.has(name)) {
        if (!expectedProp.optional) {
          diffs.push({
            path: [...path, name],
            kind: DiffKind.Missing,
            expected: this.nodeToString(expectedProp),
            message: `Missing property: ${name}`,
          });
        }
      } else {
        const actualProp = actualProps.get(name)!;
        this.compareNodes(expectedProp, actualProp, [...path, name], diffs);
      }
    }

    // Check for extra properties
    for (const [name, actualProp] of actualProps) {
      if (!expectedProps.has(name)) {
        diffs.push({
          path: [...path, name],
          kind: DiffKind.Extra,
          actual: this.nodeToString(actualProp),
          message: `Extra property: ${name}`,
        });
      }
    }
  }

  /**
   * Compare array/tuple type nodes
   */
  private compareArrays(
    expected: TypeNode,
    actual: TypeNode,
    path: string[],
    diffs: TypeDiff[]
  ): void {
    const expectedChildren = expected.children || [];
    const actualChildren = actual.children || [];

    const maxLength = Math.max(expectedChildren.length, actualChildren.length);

    for (let i = 0; i < maxLength; i++) {
      const expectedChild = expectedChildren[i];
      const actualChild = actualChildren[i];

      if (!expectedChild) {
        diffs.push({
          path: [...path, `[${i}]`],
          kind: DiffKind.Extra,
          actual: this.nodeToString(actualChild),
          message: `Extra element at index ${i}`,
        });
      } else if (!actualChild) {
        diffs.push({
          path: [...path, `[${i}]`],
          kind: DiffKind.Missing,
          expected: this.nodeToString(expectedChild),
          message: `Missing element at index ${i}`,
        });
      } else {
        this.compareNodes(expectedChild, actualChild, [...path, `[${i}]`], diffs);
      }
    }
  }

  /**
   * Compare union/intersection type nodes
   */
  private compareComposites(
    expected: TypeNode,
    actual: TypeNode,
    path: string[],
    diffs: TypeDiff[]
  ): void {
    // For unions/intersections, we do a simple length check
    // More sophisticated comparison could match constituent types
    const expectedChildren = expected.children || [];
    const actualChildren = actual.children || [];

    if (expectedChildren.length !== actualChildren.length) {
      diffs.push({
        path,
        kind: DiffKind.TypeMismatch,
        expected: `${expected.kind} with ${expectedChildren.length} types`,
        actual: `${actual.kind} with ${actualChildren.length} types`,
        message: `${expected.kind} length mismatch`,
      });
    }
  }

  /**
   * Convert TypeNode to string representation
   */
  private nodeToString(node: TypeNode): string {
    if (node.name) return node.name;
    if (node.value !== undefined) return String(node.value);
    return node.kind;
  }
}
