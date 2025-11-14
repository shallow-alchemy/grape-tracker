import { render, screen } from '@testing-library/react';
import { test, expect, rs } from '@rstest/core';
import { App } from './App';

rs.mock('@clerk/clerk-react');
rs.mock('./contexts/ZeroContext');

test('renders without crashing', () => {
  render(<App />);
  expect(document.body).toBeInTheDocument();
});
