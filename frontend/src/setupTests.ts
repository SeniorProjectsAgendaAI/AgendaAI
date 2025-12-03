// frontend/src/setupTests.ts
import '@testing-library/jest-dom'; // (Keep this if you already have it)

// MOCK Amplify UI
jest.mock('@aws-amplify/ui-react', () => {
  const React = require('react');
  
  return {
    // 1. Mock the <Authenticator> component to just render its children directly
    Authenticator: ({ children }: any) => {
      return React.createElement('div', null, children);
    },
    
    // 2. Mock the withAuthenticator HOC to just return the component as-is
    withAuthenticator: (Component: any) => {
      return (props: any) => React.createElement(Component, props);
    }
  };
});