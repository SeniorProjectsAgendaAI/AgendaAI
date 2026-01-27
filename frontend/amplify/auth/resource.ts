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
      callbackUrls: [
        'http://localhost:3000/', 
        // Dev Amplify Console domain
        'https://dev.d2i3jqbsdy4snq.amplifyapp.com/',
        // Dashboard domain 
        'https://dashboard.d2i3jqbsdy4snq.amplifyapp.com/',
        // Main domain
        'https://main.d2i3jqbsdy4snq.amplifyapp.com/',
        'https://main.d2i3jqbsdy4snq.amplifyapp.com'
      ],
      logoutUrls: [
        'http://localhost:3000/',
        // Dev Amplify Console domain
        'https://dev.d2i3jqbsdy4snq.amplifyapp.com/',
        // Dashboard domain
        'https://dashboard.d2i3jqbsdy4snq.amplifyapp.com/',
        // Main Domain
        'https://main.d2i3jqbsdy4snq.amplifyapp.com/',
        'https://main.d2i3jqbsdy4snq.amplifyapp.com'
      ],
    },
  },
});
