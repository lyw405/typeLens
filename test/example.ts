/**
 * TypeLens Test File
 * Use this file to test TypeLens features
 */

// Simple types
type UserId = string;
type UserAge = number;

// Object type
interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  isActive: boolean;
}

// Complex nested type
interface UserProfile {
  user: User;
  settings: {
    theme: 'light' | 'dark';
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  permissions: Array<'read' | 'write' | 'admin'>;
}

// Generic type
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Union type
type Status = 'pending' | 'active' | 'suspended' | 'deleted';

// Intersection type
type UserWithTimestamps = User & {
  createdAt: Date;
  updatedAt: Date;
};

// Mapped type
type MyReadonly<T> = {
  readonly [P in keyof T]: T[P];
};

// Conditional type
type MyNonNullable<T> = T extends null | undefined ? never : T;

// Template literal type
type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Endpoint = `/${string}`;
type APIRoute = `${HTTPMethod} ${Endpoint}`;

// Function type
type EventHandler = (event: MouseEvent) => void;

// Test variables to inspect
const testUser: User = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  isActive: true,
};

const testResult: Result<User> = {
  success: true,
  data: testUser,
};

// Test function
function processUser(user: User): UserWithTimestamps {
  return {
    ...user,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Instructions:
 * 
 * 1. Place cursor on any type/interface name (e.g., User, UserProfile)
 * 2. Right-click and select "Inspect Type with TypeLens"
 * 3. Or use keyboard shortcut: Cmd+Shift+T (Mac) / Ctrl+Shift+T (Windows)
 * 4. Look for Code Lens "🔍 Inspect" above type definitions
 */
