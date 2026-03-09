// Author: Ankush
// This file is used to set up the testing environment for Jest and the Testing Library

import React from "react";
import "@testing-library/jest-dom";
import { toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

jest.mock("@aws-amplify/ui-react", () => ({
  Authenticator: ({ children }: any) => children,
  useAuthenticator: () => ({
    user: { username: "test-user" },
    signOut: jest.fn(),
  }),
}));

jest.mock("@aws-amplify/ui-react/styles.css", () => ({}), { virtual: true });

// Mock Radix UI
jest.mock("@radix-ui/themes/styles.css", () => ({}), { virtual: true });
jest.mock("@radix-ui/themes", () => ({
  Theme: ({ children }: any) => children,
  Button: ({ children, ...props }: any) =>
    React.createElement("button", props, children),
  Flex: ({ children, ...props }: any) =>
    React.createElement("div", props, children),
  Text: ({ children, ...props }: any) =>
    React.createElement("span", props, children),
}));

jest.mock("axios", () => ({
  create: () => ({
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    defaults: { headers: { common: {} } },
  }),
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
}));
