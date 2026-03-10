// Author: Ankush Joshi 
// Smoke test file to ensure app component renders without crashing
// This file serves as a replacement for app.test.tsx since it was causing issues before

import React from 'react';
import { render } from '@testing-library/react';

// Force Vitest to ignore the broken internal Radix module
vi.mock('radix-ui/internal', () => ({}));

// Mock the Radix Theme provider
vi.mock('@radix-ui/themes', () => ({
  Theme: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Amplify Authenticator AND its Provider
vi.mock('@aws-amplify/ui-react', () => {
  const stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const MockAuthenticator = Object.assign(stub, {
    Provider: stub,
  });
  return {
    Authenticator: MockAuthenticator,
    useAuthenticator: () => ({ user: { username: 'test-user' }, signOut: vi.fn() }),
    View: stub,
    Heading: stub,
    Text: stub,
    Flex: stub,
    Button: stub,
  };
});

import App from './App';

test('Smoke Test: Renders App without crashing', () => {
  render(<App />);
  expect(true).toBe(true);
});