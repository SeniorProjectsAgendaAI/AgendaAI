// Author: Ankush Joshi 
// CS425: Senior Projects

// resource.ts: responsible for configuring authentication resources using AWS Amplify's backend framework.

import { defineAuth, secret } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true, // This handles the email/password portion
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        scopes: ['email', 'profile', 'openid'],
      },

      loginWithAmazon: {
        clientId: secret('AMAZON_CLIENT_ID'),
        clientSecret: secret('AMAZON_CLIENT_SECRET'),
        scopes: ['profile']
      }, 
      callbackUrls: [
        'http://localhost:3000/', 
        'https://main.d2i3jqbsdy4snq.amplifyapp.com/',
        'https://dev.d2i3jqbsdy4snq.amplifyapp.com/',
        'https://creating-dockerfile.d2i3jqbsdy4snq.amplifyapp.com/',
      ],
      logoutUrls: [
        'http://localhost:3000/',
        'https://main.d2i3jqbsdy4snq.amplifyapp.com/',
        'https://dev.d2i3jqbsdy4snq.amplifyapp.com/',
        'https://creating-dockerfile.d2i3jqbsdy4snq.amplifyapp.com/',
      ],
    },
  },
  // adding in name 
  userAttributes: {
    fullname: {
      mutable: true,
      required: false, 
    },
  },
});