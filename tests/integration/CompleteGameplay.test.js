// tests/integration/CompleteGameplay.test.js

import { setupCompleteGame, verifyGameState, cleanupGame, waitForState } from '../testUtils';
import CardService from '../../services/CardService';
import { GAME_STATUS } from '../../services/peer/GameManager';

jest.setTimeout(30000); // Increase timeout for integration tests

describe('Complete Gameplay', () => {
  let peers = {};
  const MOCK_WORDS = [
    { 
      id: '1', 
      word: 'COMPUTER', 
      tabooWords: ['SCREEN', 'KEYBOARD', 'MOUSE'], 
      category: 'technology', 
      difficulty: 'easy' 
    }
  ];

  beforeEach(() => {
    jest.spyOn(CardService, 'getRandomCard').mockImplementation(() => MOCK_WORDS[0]);
  });

  afterEach(async () => {
    cleanupGame(peers);
    peers = {};
    jest.clearAllMocks();
  });

  test('complete game cycle with 4 players', async () => {
    // Setup game with all peers
    peers = await setupCompleteGame();
    expect(peers.roomCode).toBeTruthy();

    // Set up teams
    console.log('[Test] Setting up teams...');
    const teamUpdate = {
      teams: {
        team1: { name: 'Team 1', players: ['Host', 'Player2'], score: 0 },
        team2: { name: 'Team 2', players: ['Player3', 'Player4'], score: 0 }
      }
    };

    peers.host.stateManager.updateState(teamUpdate, true);

    // Wait for team update to propagate to all peers
    await Promise.all(Object.values(peers).map(peer =>
      waitForState(peer, state => 
        state?.teams?.team1?.players?.includes('Host') &&
        state?.teams?.team2?.players?.includes('Player3')
      )
    ));

    // Start game
    console.log('[Test] Starting game...');
    const gameStarted = peers.host.gameManager.startGame();
    expect(gameStarted).toBe(true);

    // Wait for game to start on all peers
    await Promise.all(Object.values(peers).map(peer =>
      waitForState(peer, state => state?.status === GAME_STATUS.PLAYING)
    ));

    // Verify initial game state
    await verifyGameState(peers, {
      status: GAME_STATUS.PLAYING,
      currentWord: {
        word: 'COMPUTER',
        tabooWords: ['SCREEN', 'KEYBOARD', 'MOUSE']
      }
    });

    // Submit a correct guess
    console.log('[Test] Submitting guess...');
    await peers.player2.gameManager.handleGuess({ guess: MOCK_WORDS[0].word });

    // Wait for score update
    await waitForState(peers.host, state => 
      state?.teams?.team1?.score > 0
    );

    // Verify score update propagated
    await Promise.all(Object.values(peers).map(peer =>
      waitForState(peer, state => state?.teams?.team1?.score > 0)
    ));

    // End turn
    console.log('[Test] Ending turn...');
    await peers.host.gameManager.endTurn();

    // Wait for turn transition
    await Promise.all(Object.values(peers).map(peer =>
      waitForState(peer, state => state?.currentTurn?.team === 'team2')
    ));

    // Verify final states are consistent
    const finalStates = await Promise.all(
      Object.values(peers).map(peer => peer.stateManager.getState())
    );

    finalStates.forEach(state => {
      expect(state).not.toBeNull();
      expect(state.status).toBe(GAME_STATUS.PLAYING);
      expect(state.teams.team1.score).toBe(finalStates[0].teams.team1.score);
      expect(state.currentTurn.team).toBe('team2');
    });
  });
});
