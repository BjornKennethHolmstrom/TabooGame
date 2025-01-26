// tests/integration/Performance.test.js
import { waitForState, setupPeerConnections, createGamePeer } from '../testUtils';
import PeerConnection from '../../services/peer/PeerConnection';
import { act, waitFor } from '@testing-library/react';

describe('Performance', () => {
  test('should handle rapid state updates', async () => {
    const { peer1, peer2 } = await setupPeerConnections();
    
    // Setup game
    const roomCode = await peer1.createRoom();
    await peer2.joinRoom(roomCode, 'Player1');
    
    // Add players to teams first
    peer1.stateManager.updateState({
      teams: {
        team1: { name: 'Team 1', players: ['Player1'], score: 0 },
        team2: { name: 'Team 2', players: ['Player2'], score: 0 }
      }
    }, true);

    // Start game
    peer1.gameManager.startGame();
    
    // Wait for game to start
    await waitForState(peer2, state => state?.status === 'playing');
    
    // Simulate rapid guesses
    const guesses = Array.from({ length: 100 }, (_, i) => `word${i}`);
    
    for (const guess of guesses) {
      await peer2.gameManager.handleGuess({ guess });
      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Verify state consistency
    await waitForState(peer2, state => {
      const state1 = peer1.stateManager.getState();
      const state2 = state;
      console.log('Comparing states:', {state1, state2});
      return JSON.stringify(state1.teams) === JSON.stringify(state2.teams);
    });
  });

  test('should handle multiple simultaneous connections', async () => {
    const peerConnections = await Promise.all(
      Array.from({ length: 10 }, (_, i) => 
        createGamePeer(`Player${i}`)
      )
    );
    
    const host = peerConnections[0];
    const roomCode = await host.createRoom();
    
    // All peers join simultaneously
    await Promise.all(
      peerConnections.slice(1).map(async peer => {
        try {
          await peer.joinRoom(roomCode, peer.metadata.nickname);
          console.log(`${peer.metadata.nickname} joined room successfully`);
        } catch (error) {
          console.error(`Error joining room for ${peer.metadata.nickname}:`, error);
        }
      })
    );
    
    // Verify all connections established
    await waitForState(host, state => {
      const connections = host.getConnectedPeers();
      console.log('Connected peers:', connections);
      return connections.length === peerConnections.length - 1;
    }, 5000);

    // Additional verification of state propagation
    await Promise.all(peerConnections.slice(1).map(async peer => {
      await waitForState(peer, state => {
        console.log(`State for ${peer.metadata.nickname}:`, state);
        return state?.host === host.peerId;
      }, 2000);
    }));

    // Cleanup
    peerConnections.forEach(peer => peer.cleanupGame());
  });
});

describe('Team Validation Edge Cases', () => {
  test('handles player switching teams with minimum player requirement', async () => {
    const { peer1: host, peer2: player1, peer3: player2, peer4: player3 } = await setupPeerConnections();
    
    const roomCode = await host.createRoom();
    await player1.joinRoom(roomCode);
    await player2.joinRoom(roomCode);
    await player3.joinRoom(roomCode);

    // Setup initial teams
    host.stateManager.updateState({
      teams: {
        team1: { name: 'Team 1', players: ['Player1', 'Player2'], score: 0 },
        team2: { name: 'Team 2', players: ['Player3', 'Player4'], score: 0 }
      }
    }, true);

    // Start game
    let gameStarted = host.gameManager.startGame();
    expect(gameStarted).toBe(true);

    // Try to switch player leaving team with only one player
    host.stateManager.updateState({
      teams: {
        team1: { name: 'Team 1', players: ['Player1'], score: 0 },
        team2: { name: 'Team 2', players: ['Player2', 'Player3', 'Player4'], score: 0 }
      }
    }, true);

    // Attempt to start game should now fail
    gameStarted = host.gameManager.startGame();
    expect(gameStarted).toBe(false);
  });
});
