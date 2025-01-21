// tests/testUtils.js
import PeerConnection from '../services/peer/PeerConnection';
import StateManager from '../services/peer/StateManager';
import GameManager from '../services/peer/GameManager';
import HostManager from '../services/peer/HostManager';

export const createGamePeer = async (nickname) => {
  console.log(`Creating game peer for ${nickname}...`);
  const peerConnection = new PeerConnection();
  const stateManager = new StateManager(peerConnection);
  const gameManager = new GameManager(peerConnection, stateManager);
  const hostManager = new HostManager(peerConnection, stateManager);

  await peerConnection.initialize({ nickname });
  console.log(`Peer initialized with ID: ${peerConnection.peerId}`);

  // Add game-specific methods
  peerConnection.createRoom = async () => {
    console.log('Creating room...');
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
    console.log('Initializing state:', initialState);
    stateManager.initialize(initialState);
    return peerConnection.peerId; // Use peer ID as room code
  };

  peerConnection.joinRoom = async (roomCode, playerName) => {
    console.log(`Joining room ${roomCode} as ${playerName}...`);
    await peerConnection.connectTo(roomCode);
    console.log('Connected to room, requesting state...');
    stateManager.requestState();
    return true;
  };

  peerConnection.cleanupGame = () => {
    console.log(`Cleaning up peer ${peerConnection.peerId}...`);
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

export const waitForState = async (peer, predicate, timeout = 2000) => {
  if (!peer?.stateManager) {
    throw new Error('Peer or state manager not initialized');
  }

  try {
    return await peer.stateManager.waitForStateCondition(predicate, timeout);
  } catch (error) {
    console.error('Wait for state failed:', {
      currentState: peer.stateManager.getState(),
      error: error.message
    });
    throw error;
  }
};

export const setupGameState = async ({host, player1, player2}) => {
  // Initialize peers
  await host.initialize({ nickname: 'Host' });
  await player1.initialize({ nickname: 'Player1' });
  await player2.initialize({ nickname: 'Player2' });

  // Create room
  const roomCode = await host.createRoom();

  // Connect players
  await player1.joinRoom(roomCode);
  await player2.joinRoom(roomCode);

  // Wait for connections to be established
  await waitForState(host, state => 
    state?.status === 'waiting' && 
    host.getConnectedPeers().length === 2
  );

  return { host, player1, player2, roomCode };
};
