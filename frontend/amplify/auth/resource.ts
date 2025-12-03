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
        'https://feature-auth-fresh-start.d2i3jqbsdy4snq.amplifyapp.com/',
        'https://feature-auth-fresh-start.d2i3jqbsdy4snq.amplifyapp.com'
      ],
      logoutUrls: [
        'http://localhost:3000/',
        'https://feature-auth-fresh-start.d2i3jqbsdy4snq.amplifyapp.com/',
        'https://feature-auth-fresh-start.d2i3jqbsdy4snq.amplifyapp.com'
      ],
    },
  },
});