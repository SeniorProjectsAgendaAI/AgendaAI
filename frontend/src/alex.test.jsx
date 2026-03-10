import { render, screen } from '@testing-library/react';
import React from 'react';
import Profile from './pages/Profile/Profile';

// Override the global mock with test-specific user details
jest.mock('@aws-amplify/ui-react', () => ({
  useAuthenticator: () => ({
    signOut: jest.fn(),
    user: {
      signInDetails: {
        loginId: 'alex_test_user@example.com'
      }
    }
  })
}));

// Unit test: does the profile component display the right user name
describe('Profile Component Unit Tests', () => {
    it('Displays correct user name from loginId', () => {
        // Call to actually render the profile page
        render(<Profile />);

        // Scans page for the greeting message with the email
        const greeting = screen.getByText(/Hi, alex_test_user@example.com/i);
        expect(greeting).toBeInTheDocument();
    });
});