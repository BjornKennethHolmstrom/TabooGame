// tests/TeamScore.test.jsx
import { render, screen } from '@testing-library/react';
import TeamScore from '../components/GameRoom/TeamScore';

describe('TeamScore', () => {
  test('renders team name and score', () => {
    render(<TeamScore teamName="Test Team" score={5} />);
    expect(screen.getByText('Test Team')).toBeInTheDocument();
    expect(screen.getByText('Score: 5')).toBeInTheDocument();
  });
});
