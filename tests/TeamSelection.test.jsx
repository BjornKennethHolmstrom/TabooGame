// tests/TeamSelection.test.jsx
import { render, screen } from '@testing-library/react';
import TeamSelection from '../components/TeamSelection/TeamSelection';

describe('TeamSelection', () => {
  const defaultProps = {
    teams: {
      team1: { name: 'Team 1', players: [] },
      team2: { name: 'Team 2', players: [] }
    },
    roomCode: 'ABC123',
    onJoinTeam: jest.fn(),
    onStartGame: jest.fn(),
    isHost: false
  };

  test('renders room code when provided', () => {
    render(<TeamSelection {...defaultProps} />);
    expect(screen.getByText(/ABC123/)).toBeInTheDocument();
  });

  test('shows correct button text for non-host', () => {
    render(<TeamSelection {...defaultProps} />);
    expect(screen.getByRole('button', { name: /waiting for host/i })).toBeDisabled();
  });

  test('shows correct button text for host', () => {
    render(<TeamSelection {...defaultProps} isHost={true} />);
    const button = screen.getByRole('button', { name: /need players in both teams/i });
    expect(button).toBeDisabled();
  });
});
