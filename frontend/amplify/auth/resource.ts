// Author: Ankush Joshi 
// CS425: Senior Projects

// resource.ts: responsible for configuring authentication resources using AWS Amplify's backend framework.

import { defineAuth, secret } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        scopes: ['email', 'profile', 'openid'],
      },

      // loginWithAmazon: {
      //   clientId: secret('AMAZON_CLIENT_ID'),
      //   clientSecret: secret('AMAZON_CLIENT_SECRET'),
      //   scopes: ['profile']
      // }, 
      callbackUrls: [
        'http://localhost:3000/', 
        // Amplify Console domain for auth-start-branch. DELETE THESE WHEN BRANCH IS DELETED
        'https://feature-auth-fresh-start.d2i3jqbsdy4snq.amplifyapp.com/',
        'https://feature-auth-fresh-start.d2i3jqbsdy4snq.amplifyapp.com',
        // Dev Amplify Console domain
        'https://dev.d2i3jqbsdy4snq.amplifyapp.com/',
        // Dashboard domain 
        'https://dashboard.d2i3jqbsdy4snq.amplifyapp.com/',
      ],
      logoutUrls: [
        'http://localhost:3000/',
         // Amplify Console domain for auth-start-branch. DELETE THESE WHEN BRANCH IS DELETED
        'https://feature-auth-fresh-start.d2i3jqbsdy4snq.amplifyapp.com/',
        'https://feature-auth-fresh-start.d2i3jqbsdy4snq.amplifyapp.com',
        // Dev Amplify Console domain
        'https://dev.d2i3jqbsdy4snq.amplifyapp.com/',
        // Dashboard domain
        'https://dashboard.d2i3jqbsdy4snq.amplifyapp.com/'
      ],
    },
  },
});
