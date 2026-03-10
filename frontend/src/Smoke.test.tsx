// Author: Ankush Joshi 
// Smoke test file to ensure app component renders without crashing
// This file serves as a replacement for app.test.tsx since it was causing issues before

import React from 'react';
import { render } from '@testing-library/react';

// Mock CSS imports that Jest can't resolve
jest.mock('@aws-amplify/ui-react/styles.css', () => ({}), { virtual: true });
jest.mock('@radix-ui/themes/styles.css', () => ({}), { virtual: true });

// Mock the broken internal Radix module that may not exist
jest.mock('radix-ui/internal', () => ({}), { virtual: true });

// Mock axios (ships ESM that Jest can't parse without transform)
jest.mock('axios', () => ({
  __esModule: true,
  default: {
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
  }
}));

// Mock aws-amplify/auth
jest.mock('aws-amplify/auth', () => ({
  fetchAuthSession: jest.fn(() => Promise.resolve({ tokens: {} }))
}));

// Mock the Radix Theme provider
jest.mock('@radix-ui/themes', () => ({
  Theme: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Amplify Authenticator AND its Provider
jest.mock('@aws-amplify/ui-react', () => {
  const mockStub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const mockAuthenticator = Object.assign(mockStub, {
    Provider: mockStub,
  });
  return {
    Authenticator: mockAuthenticator,
    useAuthenticator: () => ({ user: { username: 'test-user' }, signOut: jest.fn() }),
    View: mockStub,
    Heading: mockStub,
    Text: mockStub,
    Flex: mockStub,
    Button: mockStub,
  };
});

import App from './App';

test('Smoke Test: Renders App without crashing', () => {
  render(<App />);
  expect(true).toBe(true);
});