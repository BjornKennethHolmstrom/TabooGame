// TeamList.test.jsx
import { render, screen } from '@testing-library/react';
import TeamList from '../components/TeamSelection/TeamList';

describe('TeamList', () => {
  const mockPlayers = ['Player 1', 'Player 2', 'Player 3'];

  test('renders team name', () => {
    render(<TeamList teamName="Test Team" players={[]} />);
    expect(screen.getByText('Test Team')).toBeInTheDocument();
  });

  test('renders all players', () => {
    render(<TeamList teamName="Test Team" players={mockPlayers} />);

    mockPlayers.forEach(player => {
      expect(screen.getByText(player)).toBeInTheDocument();
    });
  });

  test('renders empty team correctly', () => {
    render(<TeamList teamName="Empty Team" players={[]} />);
    
    expect(screen.getByText('Empty Team')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});
