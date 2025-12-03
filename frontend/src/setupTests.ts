// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock the CSS file import from Amplify UI (safe no-op)
jest.mock(
  '@aws-amplify/ui-react/styles.css',
  () => ({}),
  { virtual: true }
);

// Mock @aws-amplify/ui-react so importing it in App.tsx does not execute browser-only code
jest.mock(
  '@aws-amplify/ui-react',
  () => {
    const React = require('react');
    return {
      // Simple pass-through component for Authenticator
      Authenticator: ({ children }: { children: React.ReactNode }) => {
        return React.createElement('div', { 'data-testid': 'authenticator' }, children);
      },
      // Higher-order component that wraps a component with mock auth
      withAuthenticator: (Component: React.ComponentType<any>) => {
        return (props: any) => {
          const mockAuthProps = {
            signOut: jest.fn(),
            user: { username: 'testuser' },
          };
          return React.createElement(Component, { ...props, ...mockAuthProps });
        };
      },
      // Export empty type placeholder (not used at runtime, only for TypeScript)
      WithAuthenticatorProps: {},
    };
  },
  { virtual: true }
);
