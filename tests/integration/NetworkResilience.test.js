// tests/integration/NetworkResilience.test.js
import { setupPeerConnections, waitForState } from '../testUtils';
import { clearStores } from '../__mocks__/peerjs';

jest.setTimeout(30000); // Increase timeout for network tests

describe('Network Resilience', () => {
  let peers;

  beforeEach(async () => {
    clearStores();
    peers = await setupPeerConnections();
  });

  afterEach(() => {
    clearStores();
    // Clean up all peers
    Object.values(peers).forEach(peer => {
      try {
        peer.cleanupGame();
      } catch (e) {
        // Ignore cleanup errors
      }
    });
  });

  const waitForConnection = async (peer1, peer2, timeoutMs = 2000) => {
    console.log(`Waiting for connection between ${peer1.peerId} and ${peer2.peerId}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const result = await waitForState(peer2, state => {
      console.log('Checking connection state:', {
        currentHost: state?.host,
        expectedHost: peer1.peerId,
        stateExists: !!state
      });
      return state?.host === peer1.peerId;
    }, timeoutMs);
    console.log('Connection established:', result);
    return result;
  };

  test('should handle intermittent connections', async () => {
    const { peer1, peer2 } = peers;
    
    console.log('\n=== Creating Room ===');
    const roomCode = await peer1.createRoom();
    console.log(`Room created: ${roomCode}`);
    console.log('Host state:', peer1.stateManager.getState());
    
    console.log('\n=== Joining Room ===');
    await peer2.joinRoom(roomCode, 'Player1');
    console.log('Peer2 joined');
    console.log('Host state after join:', peer1.stateManager.getState());
    console.log('Peer2 state after join:', peer2.stateManager.getState());
    
    // Verify initial connection with longer timeout
    await waitForState(peer2, state => {
      console.log('Checking initial state:', state);
      return state?.host === peer1.peerId;
    }, 5000);
    
    console.log('\n=== Testing Reconnection ===');
    // Simulate network instability
    for (let i = 0; i < 3; i++) {
      console.log(`\n--- Reconnection Attempt ${i + 1} ---`);
      
      console.log('Disconnecting peer2...');
      peer2.peer.disconnect();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('Peer2 state after disconnect:', peer2.stateManager.getState());
      
      console.log('Reconnecting peer2...');
      peer2.peer.reconnect();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('Peer2 state after reconnect:', peer2.stateManager.getState());
      
      // Verify reconnection
      await waitForState(peer2, state => {
        console.log('Checking reconnected state:', state);
        return state?.host === peer1.peerId;
      }, 5000);
    }
  });

  test('maintains team requirements during reconnection', async () => {
    const { peer1: host, peer2: player1, peer3: player2, peer4: player3 } = await setupPeerConnections();
    
    const roomCode = await host.createRoom();
    await player1.joinRoom(roomCode);
    await player2.joinRoom(roomCode);
    await player3.joinRoom(roomCode);

    // Setup teams with sufficient players
    host.stateManager.updateState({
      teams: {
        team1: { name: 'Team 1', players: ['Player1', 'Player2'], score: 0 },
        team2: { name: 'Team 2', players: ['Player3', 'Player4'], score: 0 }
      }
    }, true);

    // Start game
    const gameStarted = host.gameManager.startGame();
    expect(gameStarted).toBe(true);

    // Simulate disconnection and reconnection
    player1.peer.disconnect();
    await new Promise(resolve => setTimeout(resolve, 100));
    player1.peer.reconnect();

    // Verify game state maintained
    await waitForState(player1, state => 
      state?.status === 'playing' &&
      state?.teams?.team1?.players?.length >= 2 &&
      state?.teams?.team2?.players?.length >= 2
    );
  });
});
