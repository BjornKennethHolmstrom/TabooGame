// tests/integration/TabooGame.test.js
import React from 'react';
import { setupPeerConnections, waitForState, setupGameState, createGamePeer } from '../testUtils';
import { act, render, fireEvent, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TabooGame from '../../components/TabooGame';

describe('TabooGame Integration', () => {

  const waitForInitialization = async (getByTestId, queryByTestId) => {
    // First verify the game container is rendered
    await waitFor(() => {
      expect(getByTestId('game-container')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Wait for connection status to change from "Connecting..."
    await waitFor(() => {
      const connectionStatus = getByTestId('connection-status');
      const statusText = connectionStatus.textContent.toLowerCase();
      expect(statusText).not.toContain('connecting');
    }, { timeout: 3000 }); // Increased timeout for connection

    // Then wait for game phase to contain setup screen
    await waitFor(() => {
      const gamePhase = getByTestId('game-phase');
      const setupScreen = queryByTestId('setup-screen');
      expect(setupScreen).toBeInTheDocument();
    }, { timeout: 2000 });
  };

  const waitForPlayerInput = async (getByTestId) => {
    return await waitFor(
      () => {
        const input = getByTestId('player-name-input');
        expect(input).toBeInTheDocument();
        return input;
      },
      { timeout: 2000 }
    );
  };

  const completeSetup = async (getByTestId, playerName) => {
    await waitForInitialization(getByTestId);
    const playerInput = await waitForPlayerInput(getByTestId);
    
    await act(async () => {
      fireEvent.change(playerInput, {
        target: { value: playerName }
      });
      
      await waitFor(() => {
        const createButton = getByTestId('create-room-button');
        expect(createButton).toBeEnabled();
      });
      
      fireEvent.click(getByTestId('create-room-button'));
    });
  };

  describe('Room Creation and Joining', () => {
    test('host should successfully create a room', async () => {
      const { getByTestId, queryByTestId } = render(<TabooGame />);
      
      await waitForInitialization(getByTestId, queryByTestId);
      const playerInput = await waitForPlayerInput(getByTestId);
 
      await act(async () => {
        fireEvent.change(playerInput, {
          target: { value: 'Host' }
        });
        
        // Wait for create button to be enabled
        await waitFor(() => {
          const createButton = getByTestId('create-room-button');
          expect(createButton).toBeEnabled();
        });
        
        fireEvent.click(getByTestId('create-room-button'));
      });

      // Verify room creation
      await waitFor(() => {
        expect(getByTestId('room-code')).toBeInTheDocument();
      });
    });

    test('players should successfully join an existing room', async () => {
      const { getByTestId, queryByTestId } = render(<TabooGame />);
      
      await waitForInitialization(getByTestId, queryByTestId);
      const playerInput = await waitForPlayerInput(getByTestId);
      
      // Click join mode
      await act(async () => {
        const joinModeButton = getByTestId('toggle-join-mode');
        fireEvent.click(joinModeButton);
      });

      // Verify join section appears
      await waitFor(() => {
        expect(getByTestId('join-game-section')).toBeInTheDocument();
      });

      await act(async () => {
        // Enter player name
        fireEvent.change(playerInput, {
          target: { value: 'Player1' }
        });

        // Enter room code
        const roomCodeInput = getByTestId('room-code-input');
        fireEvent.change(roomCodeInput, {
          target: { value: 'TEST123' }
        });

        // Wait for join button to be enabled
        await waitFor(() => {
          const joinButton = getByTestId('join-room-button');
          expect(joinButton).toBeEnabled();
        });

        fireEvent.click(getByTestId('join-room-button'));
      });

      // Verify joined successfully
      await waitFor(() => {
        expect(getByTestId('team1-list')).toBeInTheDocument();
        expect(getByTestId('team2-list')).toBeInTheDocument();
      });
    });

    test('should handle invalid room codes', async () => {
      const { getByTestId, getByText } = render(<TabooGame />);

      await act(async () => {
        fireEvent.click(getByText('Join existing room?'));
        fireEvent.change(getByTestId('room-code-input'), {
          target: { value: 'INVALID' }
        });
        fireEvent.click(getByTestId('join-room-button'));
      });

      await waitFor(() => {
        expect(getByText('Failed to join room. Please check the code and try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Team Formation', () => {
    test('players should be able to join and switch teams', async () => {
      const { getByTestId, getByText } = render(<TabooGame />);
      
      // Setup game room first
      await act(async () => {
        fireEvent.change(getByTestId('player-name-input'), {
          target: { value: 'Player1' }
        });
        fireEvent.click(getByTestId('create-room-button'));
      });

      // Join team 1
      await act(async () => {
        fireEvent.change(getByTestId('join-name-input'), {
          target: { value: 'Player1' }
        });
        fireEvent.select(getByTestId('team-select'), 'team1');
        fireEvent.click(getByTestId('join-team-button'));
      });

      // Verify player is in team 1
      expect(getByTestId('team1-list')).toHaveTextContent('Player1');

      // Switch to team 2
      await act(async () => {
        fireEvent.select(getByTestId('team-select'), 'team2');
        fireEvent.click(getByTestId('join-team-button'));
      });

      // Verify player switched teams
      expect(getByTestId('team2-list')).toHaveTextContent('Player1');
    });

    test('game should enforce minimum players requirement', async () => {
      const { getByTestId, getByText } = render(<TabooGame />);

      // Setup host
      await act(async () => {
        fireEvent.change(getByTestId('player-name-input'), {
          target: { value: 'Host' }
        });
        fireEvent.click(getByTestId('create-room-button'));
      });

      // Try to start game with no players
      await act(async () => {
        fireEvent.click(getByTestId('start-game-button'));
      });

      expect(getByText('Need players in both teams to start')).toBeInTheDocument();

      // Add one player to team 1
      await act(async () => {
        fireEvent.change(getByTestId('join-name-input'), {
          target: { value: 'Player1' }
        });
        fireEvent.select(getByTestId('team-select'), 'team1');
        fireEvent.click(getByTestId('join-team-button'));
      });

      // Try to start game with only one team
      await act(async () => {
        fireEvent.click(getByTestId('start-game-button'));
      });

      expect(getByText('Need players in both teams to start')).toBeInTheDocument();
    });
  });

  describe('Game Flow', () => {
    test('full game round should execute correctly', async () => {
      const { getByTestId } = render(<TabooGame />);
      
      // Complete setup phase
      await completeSetup(getByTestId, 'Host');

      // Add players to teams
      await act(async () => {
        // Add to team 1
        fireEvent.change(getByTestId('join-name-input'), {
          target: { value: 'Player1' }
        });
        fireEvent.select(getByTestId('team-select'), 'team1');
        fireEvent.click(getByTestId('join-team-button'));

        // Add to team 2
        fireEvent.change(getByTestId('join-name-input'), {
          target: { value: 'Player2' }
        });
        fireEvent.select(getByTestId('team-select'), 'team2');
        fireEvent.click(getByTestId('join-team-button'));
      });

      // Start game
      await act(async () => {
        fireEvent.click(getByTestId('start-game-button'));
      });

      // Verify game started
      await waitFor(() => {
        expect(getByTestId('game-board')).toBeInTheDocument();
        expect(getByTestId('team1-score')).toBeInTheDocument();
        expect(getByTestId('team2-score')).toBeInTheDocument();
        expect(getByTestId('timer')).toBeInTheDocument();
      });

      // Submit guess
      await act(async () => {
        fireEvent.change(getByTestId('guess-input'), {
          target: { value: 'test-word' }
        });
        fireEvent.click(getByTestId('submit-guess-button'));
      });

      // Verify score update
      await waitFor(() => {
        expect(getByTestId('team1-score')).toHaveTextContent('1');
      });
    });

    test('turn timer and end turn functionality', async () => {
      const { getByTestId } = render(<TabooGame />);

      // Setup game room and teams
      await act(async () => {
        fireEvent.change(getByTestId('player-name-input'), {
          target: { value: 'Host' }
        });
        fireEvent.click(getByTestId('create-room-button'));
      });

      // Add players to teams
      await act(async () => {
        // Add to team 1
        fireEvent.change(getByTestId('join-name-input'), {
          target: { value: 'Player1' }
        });
        fireEvent.select(getByTestId('team-select'), 'team1');
        fireEvent.click(getByTestId('join-team-button'));

        // Add to team 2
        fireEvent.change(getByTestId('join-name-input'), {
          target: { value: 'Player2' }
        });
        fireEvent.select(getByTestId('team-select'), 'team2');
        fireEvent.click(getByTestId('join-team-button'));
      });

      // Start game
      await act(async () => {
        fireEvent.click(getByTestId('start-game-button'));
      });

      // Verify game started
      await waitFor(() => {
        expect(getByTestId('game-board')).toBeInTheDocument();
        expect(getByTestId('team1-score')).toBeInTheDocument();
        expect(getByTestId('team2-score')).toBeInTheDocument();
        expect(getByTestId('timer')).toBeInTheDocument();
      });

      // Verify timer starts at 60
      expect(getByTestId('timer')).toHaveTextContent('60');

      // Wait for timer to count down
      await waitFor(() => {
        expect(getByTestId('timer')).toHaveTextContent('59');
      }, { timeout: 2000 });

      // Test end turn button (host only)
      await act(async () => {
        fireEvent.click(getByTestId('end-turn-button'));
      });

      // Verify turn switched to other team
      await waitFor(() => {
        const team2Score = getByTestId('team2-score');
        expect(team2Score.parentElement).toHaveClass('active');
      });
    });

    test('taboo word reporting', async () => {
      const { getByTestId, getByText } = render(<TabooGame />);

      // Setup game room and teams
      await act(async () => {
        fireEvent.change(getByTestId('player-name-input'), {
          target: { value: 'Host' }
        });
        fireEvent.click(getByTestId('create-room-button'));
      });

      // Add players to teams
      await act(async () => {
        // Add to team 1
        fireEvent.change(getByTestId('join-name-input'), {
          target: { value: 'Player1' }
        });
        fireEvent.select(getByTestId('team-select'), 'team1');
        fireEvent.click(getByTestId('join-team-button'));

        // Add to team 2
        fireEvent.change(getByTestId('join-name-input'), {
          target: { value: 'Player2' }
        });
        fireEvent.select(getByTestId('team-select'), 'team2');
        fireEvent.click(getByTestId('join-team-button'));
      });

      // Start game
      await act(async () => {
        fireEvent.click(getByTestId('start-game-button'));
      });

      // Verify game started
      await waitFor(() => {
        expect(getByTestId('game-board')).toBeInTheDocument();
        expect(getByTestId('team1-score')).toBeInTheDocument();
        expect(getByTestId('team2-score')).toBeInTheDocument();
        expect(getByTestId('timer')).toBeInTheDocument();
      });

      // Report taboo word
      await act(async () => {
        fireEvent.click(getByTestId('report-taboo-button'));
      });

      // Verify turn ended and penalty applied
      await waitFor(() => {
        expect(getByText('Taboo word used!')).toBeInTheDocument();
        // Turn should switch
        expect(getByTestId('team2-score').parentElement).toHaveClass('active');
      });
    });
  });

  describe('Error Recovery & Network Resilience', () => {
    test('should handle temporary disconnections', async () => {
      const { peer1: host, peer2: player1, peer3: player2 } = await setupPeerConnections();
      
      // Setup initial game state
      const roomCode = await host.createRoom();
      await player1.joinRoom(roomCode, 'Player1');
      await player2.joinRoom(roomCode, 'Player2');
      
      // Add players to teams
      host.stateManager.updateState({
        teams: {
          team1: { name: 'Team 1', players: ['Player1'], score: 0 },
          team2: { name: 'Team 2', players: ['Player2'], score: 0 }
        }
      }, true);

      // Start game
      await host.gameManager.startGame();
      const initialState = player1.stateManager.getState();

      // Verify game started
      await waitForState(player1, state => state.status === 'playing');

      // Simulate temporary disconnection of player1
      player1.peer.disconnect();
      
      // Submit a guess during disconnection
      await host.gameManager.handleGuess({ guess: 'test-word' });
      
      // Reconnect player1
      await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay
      player1.peer.reconnect();

      // Verify state is synced after reconnection
      await waitForState(player1, state => {
        const hostState = host.stateManager.getState();
        return state?.timestamp === hostState?.timestamp;
      }, 2000);
    });

    test('should handle host disconnection and election', async () => {
      const { peer1: host, peer2: player1, peer3: player2 } = await setupPeerConnections();
      
      // Setup game
      const roomCode = await host.createRoom();
      await player1.joinRoom(roomCode, 'Player1');
      await player2.joinRoom(roomCode, 'Player2');
      
      // Add players and start game
      host.stateManager.updateState({
        teams: {
          team1: { name: 'Team 1', players: ['Player1'], score: 0 },
          team2: { name: 'Team 2', players: ['Player2'], score: 0 }
        }
      }, true);
      
      await host.gameManager.startGame();

      // Get state before host disconnection
      const preDisconnectState = host.stateManager.getState();
      
      // Simulate host disconnection
      host.cleanup();

      // Wait for new host election
      await waitForState(player1, state => {
        // Either player1 or player2 should become host
        const newHost = player1.hostManager.isHost || player2.hostManager.isHost;
        return newHost && state.status === 'playing';
      }, 5000);

      // Verify game state maintained
      const player1State = player1.stateManager.getState();
      expect(player1State.teams).toEqual(preDisconnectState.teams);
      expect(player1State.status).toBe('playing');
    });

    test('should handle multiple simultaneous disconnections', async () => {
      const { peer1: host, peer2: player1, peer3: player2 } = await setupPeerConnections();
      
      // Setup game
      const roomCode = await host.createRoom();
      await player1.joinRoom(roomCode, 'Player1');
      await player2.joinRoom(roomCode, 'Player2');
      
      // Setup teams and start game
      host.stateManager.updateState({
        teams: {
          team1: { name: 'Team 1', players: ['Player1'], score: 0 },
          team2: { name: 'Team 2', players: ['Player2'], score: 0 }
        }
      }, true);
      
      await host.gameManager.startGame();

      // Get initial state
      const initialState = host.stateManager.getState();

      // Simulate multiple disconnections
      player1.peer.disconnect();
      player2.peer.disconnect();
      
      // Make some game progress
      host.stateManager.updateState({
        teams: {
          ...initialState.teams,
          team1: { ...initialState.teams.team1, score: 1 }
        }
      }, true);

      // Reconnect both players
      await new Promise(resolve => setTimeout(resolve, 100));
      player1.peer.reconnect();
      player2.peer.reconnect();

      // Verify both players sync to latest state
      await waitForState(player1, state => 
        state?.teams?.team1?.score === 1 &&
        state?.status === 'playing'
      , 2000);
      
      await waitForState(player2, state => 
        state?.teams?.team1?.score === 1 &&
        state?.status === 'playing'
      , 2000);
    });

    test('should maintain game progress during network instability', async () => {
      const { peer1: host, peer2: player1, peer3: player2 } = await setupPeerConnections();
      
      // Setup initial game
      const roomCode = await host.createRoom();
      await player1.joinRoom(roomCode, 'Player1');
      await player2.joinRoom(roomCode, 'Player2');
      
      host.stateManager.updateState({
        teams: {
          team1: { name: 'Team 1', players: ['Player1'], score: 0 },
          team2: { name: 'Team 2', players: ['Player2'], score: 0 }
        }
      }, true);
      
      await host.gameManager.startGame();

      // Simulate intermittent connections during gameplay
      for (let i = 0; i < 3; i++) {
        // Disconnect player
        player1.peer.disconnect();
        
        // Host updates game state
        await host.gameManager.handleGuess({ guess: `word${i}` });
        
        // Brief delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Reconnect player
        player1.peer.reconnect();
        
        // Verify state syncs after each reconnection
        await waitForState(player1, state => {
          const hostState = host.stateManager.getState();
          return state?.timestamp === hostState?.timestamp &&
                 state?.teams?.team1?.score === hostState?.teams?.team1?.score;
        }, 2000);
      }
    });

    test('should handle reconnection during turn change', async () => {
      const { peer1: host, peer2: player1, peer3: player2 } = await setupPeerConnections();
      
      // Setup game
      const roomCode = await host.createRoom();
      await player1.joinRoom(roomCode, 'Player1');
      await player2.joinRoom(roomCode, 'Player2');
      
      host.stateManager.updateState({
        teams: {
          team1: { name: 'Team 1', players: ['Player1'], score: 0 },
          team2: { name: 'Team 2', players: ['Player2'], score: 0 }
        }
      }, true);
      
      await host.gameManager.startGame();

      // Disconnect player during their turn
      player1.peer.disconnect();
      
      // Host ends turn
      await host.gameManager.endTurn();
      
      // Reconnect player
      await new Promise(resolve => setTimeout(resolve, 100));
      player1.peer.reconnect();

      // Verify turn properly changed
      await waitForState(player1, state => 
        state?.currentTurn?.team === 'team2' &&
        state?.status === 'playing'
      , 2000);
    });
  });

  describe('Game Completion', () => {
    test('game should end properly with winner declared', async () => {
      const peers = await setupGameState({
        host: await createGamePeer('Host'),
        player1: await createGamePeer('Player1'),
        player2: await createGamePeer('Player2')
      });

      // Setup teams
      await act(async () => {
        peers.host.stateManager.updateState({
          teams: {
            team1: { name: 'Team 1', players: ['Player1'], score: 0 },
            team2: { name: 'Team 2', players: ['Player2'], score: 0 }
          }
        }, true);

        // Wait for state to propagate
        await waitForState(peers.player1, state => 
          state?.teams?.team1?.players?.includes('Player1')
        );
      });

      // Start game
      await act(async () => {
        await peers.host.gameManager.startGame();
        
        // Wait for game to start
        await waitForState(peers.player1, state => state?.status === 'playing');
      });

      // Simulate game play and end game
      await act(async () => {
        // Update scores
        peers.host.stateManager.updateState({
          teams: {
            team1: { name: 'Team 1', players: ['Player1'], score: 3 },
            team2: { name: 'Team 2', players: ['Player2'], score: 1 }
          }
        }, true);

        // End game
        await peers.host.gameManager.endGame();

        // Verify end state
        await waitForState(peers.player1, state => 
          state?.status === 'ended' && 
          state?.winner === 'team1' &&
          state?.teams?.team1?.score === 3
        );
      });
    });

    test('should handle tie games correctly', async () => {
      const peers = await setupGameState({
        host: await createGamePeer('Host'),
        player1: await createGamePeer('Player1'),
        player2: await createGamePeer('Player2')
      });

      // Similar setup as above but with equal scores
      await act(async () => {
        peers.host.stateManager.updateState({
          teams: {
            team1: { name: 'Team 1', players: ['Player1'], score: 2 },
            team2: { name: 'Team 2', players: ['Player2'], score: 2 }
          }
        }, true);

        await peers.host.gameManager.endGame();

        await waitForState(peers.player1, state => 
          state?.status === 'ended' && 
          state?.winner === 'tie' &&
          state?.teams?.team1?.score === state?.teams?.team2?.score
        );
      });
    });
  });
});
