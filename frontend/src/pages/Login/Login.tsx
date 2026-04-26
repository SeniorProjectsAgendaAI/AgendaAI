import React from 'react';
import { Flex as RadixFlex, Text as RadixText, Button as RadixButton } from '@radix-ui/themes';
import { Authenticator, useAuthenticator, View, Heading, Text, Flex, Button } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import "./login.css";

const formFields = {
  signIn: {
    username: {
      placeholder: 'Enter your email',
      label: 'Email',
      isRequired: true,
      dialCodeList: ['+1', '+91', '+44', '+61', '+81']
    },
  },
  signUp: {
    email: {
      placeholder: 'Enter your email',
      label: 'Email',
      order: 1,
      isRequired: true,
    },
    name: {
      placeholder: 'Enter your name',
      label: 'Full Name',
      order: 2,
      isRequired: true,
    },
    password: {
      placeholder: 'Create a password',
      label: 'Password',
      order: 3,
      isRequired: true,
    },
    confirm_password: {
      placeholder: 'Confirm your password',
      label: 'Confirm Password',
      order: 4,
      isRequired: true,
    },
    
  },
}

const components = {
  SignIn: {
    Header() {
      return (
        <RadixFlex direction="column" pt="6" px="4" pb='1'>
          <RadixText size="9" weight="bold" align="left" mb="2">
            Log in
          </RadixText>
        </RadixFlex>
      );
    },
    Footer() {
      const { toForgotPassword } = useAuthenticator();

      return (
        <RadixFlex direction="column" p="4" pt="0" gap="3">
          <RadixFlex justify="end">
            <Button fontWeight='normal' onClick={toForgotPassword} size='small' variation='link' color='#888'>
              Forgot Password?
            </Button>
          </RadixFlex>
        </RadixFlex>
      );
    }
  },
  SignUp: {
    Header() {
      return (
        <RadixFlex direction='column' p='4' pb='0'>
          <RadixText size='9' weight='bold' align='left' mb='2'>
            Create an account
          </RadixText>
        </RadixFlex>
      );
    }
  }
};

//create a hook to know if sign IN or UP to change the welcome message
const AuthLayout = () => {
  const { route } = useAuthenticator((context) => [context.route]);

  return (
    <div className="auth-split-wrapper">
      <div className="auth-sidebar">

        <Flex alignItems='center' gap='1rem' width="100%"> 
          <Heading level={4} color="white">AgendaAI</Heading>
          <div style = {{ height: '2px', backgroundColor: 'gray', flexGrow: 1, fontSize: "10rem"}}></div>
        </Flex>

        <View marginTop="20%" marginBottom="auto">
          <Text fontSize='2.8rem' fontStyle='italic' fontWeight='bold' color='gray' lineHeight='1.2'>
            "For every minute spent in organizing, an hour is earned." 
            </Text>
          <Text marginTop='15px' color='gray' fontSize="1.2rem"> Benjamin Franklin</Text>
        </View>

        {/* 2. Dynamically change the heading based on the route */}
        <Heading level={1} color='white' fontWeight='bold'>
          {route === 'signUp' ? 'Welcome!' : 'Welcome Back!'}
        </Heading>

      </div>  
      <div className='auth-form-section'>
        <Authenticator 
          components={components} 
          formFields={formFields}
          hideSignUp={false} 
        />
      </div>
    </div>
  );
};

//render it
const Login = () => {
  return (
    <Authenticator.Provider>
      <AuthLayout />
    </Authenticator.Provider>
  );
};

export default Login;