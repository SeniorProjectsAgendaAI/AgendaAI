import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Expose jest globals so test files using jest.mock/jest.fn also work in Vitest
globalThis.jest = vi;