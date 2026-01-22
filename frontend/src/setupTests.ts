// Author: Ankush 
// This file is used to set up the testing environment for Jest and the Testing Library

import '@testing-library/jest-dom';


jest.mock('@aws-amplify/ui-react', () => ({
  Authenticator: ({ children }: any) => children,
  useAuthenticator: () => ({ user: { username: 'test-user' }, signOut: jest.fn() })
}));

jest.mock('@aws-amplify/ui-react/styles.css', () => ({}), { virtual: true });

jest.mock('axios', () => ({
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
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
}));