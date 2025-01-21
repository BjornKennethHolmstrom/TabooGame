// tests/GuessInput.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GuessInput from '../components/GameRoom/GuessInput';

describe('GuessInput', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  test('renders input and submit button', () => {
    render(<GuessInput onSubmit={mockOnSubmit} />);
    expect(screen.getByTestId('guess-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-button')).toBeInTheDocument();
  });

  test('handles submit via form submission', async () => {
    render(<GuessInput onSubmit={mockOnSubmit} />);
    
    const input = screen.getByTestId('guess-input');
    await userEvent.type(input, 'test guess');
    
    const form = input.closest('form');
    fireEvent.submit(form);
    
    expect(mockOnSubmit).toHaveBeenCalledWith('test guess');
  });

  test('clears input after submission', async () => {
    render(<GuessInput onSubmit={mockOnSubmit} />);
    
    const input = screen.getByTestId('guess-input');
    await userEvent.type(input, 'test guess');
    
    const form = input.closest('form');
    fireEvent.submit(form);
    
    expect(input).toHaveValue('');
  });

  test('prevents submission when disabled', async () => {
    render(<GuessInput onSubmit={mockOnSubmit} disabled={true} />);
    
    const input = screen.getByTestId('guess-input');
    const submitButton = screen.getByTestId('submit-button');
    
    expect(input).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });
});
