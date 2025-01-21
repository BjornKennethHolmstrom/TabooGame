// PlayerJoinForm.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlayerJoinForm from '../components/TeamSelection/PlayerJoinForm';

describe('PlayerJoinForm', () => {
  const mockOnJoinTeam = jest.fn();

  beforeEach(() => {
    mockOnJoinTeam.mockClear();
  });

  test('renders form elements correctly', () => {
    render(<PlayerJoinForm onJoinTeam={mockOnJoinTeam} />);

    expect(screen.getByPlaceholderText(/enter your name/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument();
  });

  test('handles empty name submission', async () => {
    render(<PlayerJoinForm onJoinTeam={mockOnJoinTeam} />);

    const joinButton = screen.getByRole('button', { name: /join/i });
    await userEvent.click(joinButton);

    expect(mockOnJoinTeam).not.toHaveBeenCalled();
  });

  test('submits form with valid data', async () => {
    render(<PlayerJoinForm onJoinTeam={mockOnJoinTeam} />);

    const nameInput = screen.getByPlaceholderText(/enter your name/i);
    const teamSelect = screen.getByRole('combobox');
    const joinButton = screen.getByRole('button', { name: /join/i });

    await userEvent.type(nameInput, 'John Doe');
    await userEvent.selectOptions(teamSelect, 'team2');
    await userEvent.click(joinButton);

    expect(mockOnJoinTeam).toHaveBeenCalledWith('John Doe', 'team2');
  });
});
