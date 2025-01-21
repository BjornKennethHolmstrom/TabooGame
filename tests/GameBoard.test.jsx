// GameBoard.test.jsx
import { render, screen } from '@testing-library/react';
import GameBoard from '../components/GameRoom/GameBoard';

describe('GameBoard', () => {
  const defaultProps = {
    currentWord: 'Example',
    tabooWords: ['forbidden1', 'forbidden2', 'forbidden3'],
    timeLeft: 30,
    isDescriber: true // Add this prop
  };

  test('renders current word when describing', () => {
    render(<GameBoard {...defaultProps} />);
    expect(screen.getByText('Example')).toBeInTheDocument();
  });

  test('renders guess message when guessing', () => {
    render(<GameBoard {...defaultProps} isDescriber={false} />);
    expect(screen.getByText(/guess the word/i)).toBeInTheDocument();
  });

  test('renders all taboo words when describing', () => {
    render(<GameBoard {...defaultProps} />);
    defaultProps.tabooWords.forEach(word => {
      expect(screen.getByText(word, { exact: false })).toBeInTheDocument();
    });
  });

  test('renders timer with correct time', () => {
    render(<GameBoard {...defaultProps} />);
    expect(screen.getByText('30s')).toBeInTheDocument();
  });
});
