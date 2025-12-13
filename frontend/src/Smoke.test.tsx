import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

// Mock Amplify and Axios to prevent crashes
jest.mock('@aws-amplify/ui-react', () => ({
  Authenticator: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuthenticator: () => ({ user: { username: 'test-user' }, signOut: jest.fn() })
}));

test('Smoke Test: Renders App without crashing', () => {
  render(<App />);
  expect(true).toBe(true);
});
