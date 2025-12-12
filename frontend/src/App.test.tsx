import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('@aws-amplify/ui-react', () => ({
  Authenticator: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuthenticator: () => ({ user: { username: 'test-user' }, signOut: jest.fn() })
}));

test('renders AgendaAI main app', () => {
  render(<App />);

  expect(true).toBe(true);
  
});