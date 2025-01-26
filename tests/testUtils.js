// tests/testUtils.js
import PeerConnection from '../services/peer/PeerConnection';
import StateManager from '../services/peer/StateManager';
import GameManager from '../services/peer/GameManager';
import HostManager from '../services/peer/HostManager';

export const createGamePeer = async (nickname) => {
  console.log(`[TestUtils] Creating game peer for ${nickname}...`);
  
  const peerConnection = new PeerConnection();
  const stateManager = new StateManager(peerConnection);
  const gameManager = new GameManager(peerConnection, stateManager);
  const hostManager = new HostManager(peerConnection, stateManager);

  await peerConnection.initialize({ nickname });
  console.log(`[TestUtils] Peer initialized with ID: ${peerConnection.peerId}`);

  // Add game-specific methods
  peerConnection.createRoom = async () => {
    console.log('[TestUtils] Creating room...');
    hostManager.initializeAsHost();
    
    const initialState = {
      settings: {
        turnDuration: 60,
        rounds: 3,
        category: 'general'
      },
      status: 'waiting',
      teams: {
        team1: { name: 'Team 1', players: [], score: 0 },
        team2: { name: 'Team 2', players: [], score: 0 }
      },
      host: peerConnection.peerId,
      timestamp: Date.now()
    };
    
    // Wait for host initialization
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('[TestUtils] Initializing state:', initialState);
    stateManager.initialize(initialState);
    
    // Wait for state broadcast
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return peerConnection.peerId;
  };

  peerConnection.joinRoom = async (roomCode) => {
    console.log(`[TestUtils] Joining room ${roomCode} as ${nickname}...`);
    
    // Connect to host
    await peerConnection.connectTo(roomCode);
    console.log('[TestUtils] Connected to host, waiting for state...');
    
    // Request initial state
    await stateManager.requestState();
    
    // Wait for state to be received
    await waitForState(peerConnection, state => 
      state !== null && state.host === roomCode,
      5000
    );
    
    return true;
  };

  peerConnection.cleanupGame = () => {
    console.log(`[TestUtils] Cleaning up peer ${peerConnection.peerId}...`);
    hostManager.cleanup();
    gameManager.cleanup();
    stateManager.cleanup();
    peerConnection.cleanup();
  };

  // Attach managers for testing
  peerConnection.stateManager = stateManager;
  peerConnection.gameManager = gameManager;
  peerConnection.hostManager = hostManager;

  return peerConnection;
};

export const setupPeerConnections = async () => {
  const peer1 = await createGamePeer('Host');
  const peer2 = await createGamePeer('Player1');
  const peer3 = await createGamePeer('Player2');

  return { peer1, peer2, peer3 };
};

export const waitForState = async (peer, predicate, timeout = 5000) => {
  if (!peer?.stateManager) {
    throw new Error('Peer or state manager not initialized');
  }

  console.log(`[TestUtils] Waiting for state condition on peer ${peer.peerId}`);
  
  try {
    // First try to request state if we don't have it
    if (!peer.stateManager.getState()) {
      console.log('[TestUtils] No state found, requesting from peers');
      try {
        await peer.stateManager.requestState();
      } catch (error) {
        console.warn('[TestUtils] Failed to get initial state:', error);
      }
    }

    // Then wait for the condition
    const result = await peer.stateManager.waitForStateCondition(predicate, timeout);
    console.log('[TestUtils] State condition met:', result);
    return result;
  } catch (error) {
    console.error('Wait for state failed:', {
      currentState: peer.stateManager.getState(),
      error: error.message,
      peerId: peer.peerId
    });
    throw error;
  }
};

export const setupGameState = async ({host, player1, player2}) => {
  // Initialize peers sequentially with delays
  console.log('[TestUtils] Initializing host');
  await host.initialize({ nickname: 'Host' });
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('[TestUtils] Initializing player1');
  await player1.initialize({ nickname: 'Player1' });
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('[TestUtils] Initializing player2');
  await player2.initialize({ nickname: 'Player2' });
  await new Promise(resolve => setTimeout(resolve, 100));

  // Create room
  console.log('[TestUtils] Creating room');
  const roomCode = await host.createRoom();
  
  // Wait for host state initialization
  await waitForState(host, state => 
    state !== null && state.host === host.peerId
  );

  // Connect players sequentially
  console.log('[TestUtils] Connecting player1');
  await player1.joinRoom(roomCode);
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('[TestUtils] Connecting player2');
  await player2.joinRoom(roomCode);
  await new Promise(resolve => setTimeout(resolve, 100));

  // Wait for all connections to be established
  await Promise.all([
    waitForState(player1, state => state?.host === host.peerId),
    waitForState(player2, state => state?.host === host.peerId)
  ]);

  return { host, player1, player2, roomCode };
};

export const waitForConnections = async (host, players, timeout = 5000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const connectedPeers = host.getConnectedPeers();
    const allPlayersConnected = players.every(player => 
      connectedPeers.includes(player.peerId)
    );
    
    if (allPlayersConnected) {
      console.log('[TestUtils] All players connected:', {
        host: host.peerId,
        connected: connectedPeers
      });
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error('Timeout waiting for connections');
};

export const setupCompleteGame = async () => {
  // Create peers
  const host = await createGamePeer('Host');
  const player2 = await createGamePeer('Player2');
  const player3 = await createGamePeer('Player3');
  const player4 = await createGamePeer('Player4');

  // Create room and get room code
  console.log('[TestUtils] Setting up game room...');
  const roomCode = await host.createRoom();

  // Wait for host setup
  await waitForState(host, state => 
    state !== null && state.status === 'waiting'
  );

  // Join players sequentially with delays
  console.log('[TestUtils] Joining players to room...');
  await player2.joinRoom(roomCode);
  await new Promise(resolve => setTimeout(resolve, 100));
  
  await player3.joinRoom(roomCode);
  await new Promise(resolve => setTimeout(resolve, 100));
  
  await player4.joinRoom(roomCode);
  await new Promise(resolve => setTimeout(resolve, 100));

  // Wait for all connections and state sync
  await Promise.all([
    waitForConnections(host, [player2, player3, player4]),
    waitForState(player2, state => state?.host === host.peerId),
    waitForState(player3, state => state?.host === host.peerId),
    waitForState(player4, state => state?.host === host.peerId)
  ]);

  return {
    host,
    player2,
    player3,
    player4,
    roomCode
  };
};

export const verifyGameState = async (peers, expectedState) => {
  const states = await Promise.all(
    Object.values(peers).map(peer => peer.stateManager.getState())
  );

  states.forEach((state, index) => {
    const peerName = Object.keys(peers)[index];
    console.log(`[TestUtils] Verifying state for ${peerName}:`, state);
    
    expect(state).not.toBeNull();
    Object.entries(expectedState).forEach(([key, value]) => {
      expect(state[key]).toEqual(value);
    });
  });
};

export const cleanupGame = (peers) => {
  Object.values(peers).forEach(peer => {
    try {
      if (peer.cleanupGame) {
        peer.cleanupGame();
      }
    } catch (error) {
      console.error('[TestUtils] Error during cleanup:', error);
    }
  });
};
