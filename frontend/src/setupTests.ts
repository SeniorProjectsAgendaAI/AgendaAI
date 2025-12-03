// frontend/src/setupTests.ts
import '@testing-library/jest-dom'; // keep jest-dom matchers

// Mock the CSS file import from Amplify UI (safe no-op)
jest.mock('@aws-amplify/ui-react/styles.css', () => ({}), { virtual: true });

// Mock @aws-amplify/ui-react so importing it in App.tsx does not execute browser-only code
jest.mock('@aws-amplify/ui-react', () => {
  const React = require('react');
  return {
    // Simple pass-through component for <Authenticator>
    Authenticator: ({ children }: any) => React.createElement('div', null, children),

    // withAuthenticator HOC: return the original component unchanged
    withAuthenticator: (Component: any) => {
      return (props: any) => React.createElement(Component, props);
    },

    // Add other safe no-op exports here if App later imports them.
  };
});