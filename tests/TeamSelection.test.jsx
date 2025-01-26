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

  test('shows correct button text for insufficient players', () => {
    const teams = {
      team1: { name: 'Team 1', players: ['Player1'] },
      team2: { name: 'Team 2', players: ['Player2'] }
    };
    
    const { getByRole } = render(
      <TeamSelection {...defaultProps} teams={teams} isHost={true} />
    );
    
    expect(getByRole('button', { name: /need at least 2 players in each team/i })).toBeDisabled();
  });

  test('enables start button only when both teams have enough players', () => {
    const teams = {
      team1: { name: 'Team 1', players: ['Player1', 'Player2'] },
      team2: { name: 'Team 2', players: ['Player3', 'Player4'] }
    };
    
    const { getByRole } = render(
      <TeamSelection {...defaultProps} teams={teams} isHost={true} />
    );
    
    expect(getByRole('button', { name: /start game/i })).toBeEnabled();
  });
});
