/**
 * Format type name for display
 */
export function formatTypeName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

/**
 * Truncate long type strings
 */
export function truncateType(type: string, maxLength = 100): string {
  if (type.length <= maxLength) {
    return type;
  }
  return type.slice(0, maxLength) + '...';
}

/**
 * Create a unique ID
 */
export function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
