// tests/GameSettingsForm.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameSettingsForm from '../components/GameSetup/GameSettingsForm';

// Mock CardService
jest.mock('../services/CardService', () => ({
  __esModule: true,
  default: {
    getCategories: () => [
      { id: 'general', name: 'General' },
      { id: 'technology', name: 'Technology' }
    ],
    getDifficulties: () => [
      { id: 'easy', name: 'Easy' },
      { id: 'medium', name: 'Medium' }
    ]
  }
}));

describe('GameSettingsForm', () => {
  const mockSetGameSettings = jest.fn();
  const defaultGameSettings = {
    turnDuration: 60,
    rounds: 3,
    category: 'general',
    difficulty: 'easy'
  };

  beforeEach(() => {
    mockSetGameSettings.mockClear();
  });

  test('renders all form inputs with default values', () => {
    render(
      <GameSettingsForm 
        gameSettings={defaultGameSettings}
        setGameSettings={mockSetGameSettings}
      />
    );

    expect(screen.getByLabelText(/turn duration/i)).toHaveValue(60);
    expect(screen.getByLabelText(/number of rounds/i)).toHaveValue(3);
    expect(screen.getByLabelText(/category/i)).toHaveValue('general');
  });

  test('updates turn duration when changed', () => {
    render(
      <GameSettingsForm 
        gameSettings={defaultGameSettings}
        setGameSettings={mockSetGameSettings}
      />
    );

    const input = screen.getByLabelText(/turn duration/i);
    fireEvent.change(input, { target: { value: '90' } });

    expect(mockSetGameSettings).toHaveBeenCalledWith({
      ...defaultGameSettings,
      turnDuration: 90
    });
  });

  test('prevents invalid turn duration', () => {
    render(
      <GameSettingsForm 
        gameSettings={defaultGameSettings}
        setGameSettings={mockSetGameSettings}
      />
    );

    const input = screen.getByLabelText(/turn duration/i);
    
    // Test minimum value
    fireEvent.change(input, { target: { value: '20' } });
    expect(input).toHaveAttribute('min', '30');
    
    // Test maximum value
    fireEvent.change(input, { target: { value: '200' } });
    expect(input).toHaveAttribute('max', '180');
  });
});
