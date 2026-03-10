import { it, expect, vi, describe } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import Profile from './Profile';

// fake the login to test offline, as i read its bad practice to test with any real people data for a unit test
vi.mock('@aws-amplify/ui-react', () => (
{
  useAuthenticator: () => (
    {
        signOut: vi.fn(),
        user: 
        {
            signInDetails: 
            {
                loginId: 'alex_test_user@example.com'
            }
        }
    })
}));
//first test
describe('Unit test: does the profile component display the right user name (assume user id (email) is name for now)', () => 
{
    //i absolutley need to work on titles ik
    it('Does display correct user name', () => 
    {
        //call to actually render the profile page
        render(<Profile />);

        //scans page for the hi message with the email to check
        const greeting = screen.getByText(/Hi, alex_test_user@example.com/i);
        expect(greeting).toBeDefined();
    });
});