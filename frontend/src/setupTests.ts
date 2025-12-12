// frontend/src/setupTests.ts
import '@testing-library/jest-dom';

// --- Existing Mocks (Keep these) ---
// Mock Amplify UI to prevent login blocking
jest.mock('@aws-amplify/ui-react', () => ({
  Authenticator: ({ children }: any) => children,
  useAuthenticator: () => ({ user: { username: 'test-user' }, signOut: jest.fn() })
}));

jest.mock('@aws-amplify/ui-react/styles.css', () => ({}), { virtual: true });

// --- NEW: Mock Axios to fix "Cannot use import statement" error ---
jest.mock('axios', () => ({
  // Mock the 'create' method used in your api.ts
  create: () => ({
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() }
    },
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    defaults: { headers: { common: {} } }
  }),
  // Mock standard methods (just in case)
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
}));