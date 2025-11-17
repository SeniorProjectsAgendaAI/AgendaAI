import { render, screen } from '@testing-library/react';
import App from './App';

test('renders AgendaAI title', () => {
  render(<App />);
  const titleElement = screen.getByText(/AgendaAI/i);
  expect(titleElement).toBeInTheDocument();
});
