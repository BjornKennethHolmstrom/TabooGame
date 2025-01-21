// App.jsx
import React, { useState, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { Card } from "../components/ui/card";
import { Users, Timer, Settings, Crown } from 'lucide-react';

// Import components
import ConnectionStatus from './ConnectionStatus';
import SetupScreen from './GameSetup/SetupScreen';
import TeamSelection from './TeamSelection/TeamSelection';
import GameRoom from './GameRoom/GameRoom';

// Import our services
import PeerConnection from '../services/peer/PeerConnection';
import StateManager from '../services/peer/StateManager';
import GameManager from '../services/peer/GameManager';
import HostManager from '../services/peer/HostManager';

// Import services and constants
import { CONNECTION_STATUS } from '../services/peer/types';
import { GAME_STATUS, GAME_EVENTS } from '../services/peer/GameManager';
import { HOST_EVENTS } from '../services/peer/HostManager';

// Initialize our services
const peerConnection = new PeerConnection();
const stateManager = new StateManager(peerConnection);
const gameManager = new GameManager(peerConnection, stateManager);
const hostManager = new HostManager(peerConnection, stateManager);

const HostIndicator = ({ hostId, isCurrentPeer, nickname }) => (
  <div className="flex items-center gap-2 text-sm">
    <Crown className={`w-4 h-4 ${isCurrentPeer ? 'text-yellow-500' : 'text-gray-400'}`} />
    <span className={isCurrentPeer ? 'font-medium' : 'text-gray-600'}>
      Host: {nickname || 'Unknown'} {isCurrentPeer && '(You)'}
    </span>
  </div>
);

const TabooGame = () => {
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);
  const [recoveryMessage, setRecoveryMessage] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATUS.CONNECTING);
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  // Add message handler setup to track state messages
  useEffect(() => {
    const messageHandler = (message, senderId) => {
      console.log('Received message:', { message, senderId });
      
      if (message.type === 'stateRequest') {
        // If we're the host, send the current state
        if (hostManager.isHost && gameState) {
          console.log('Host sending state response to:', senderId);
          peerConnection.sendToPeer(senderId, {
            type: 'stateResponse',
            payload: gameState
          });
        }
      }
    };

    peerConnection.addMessageListener(messageHandler);
    return () => peerConnection.removeMessageListener(messageHandler);
  }, [gameState]); // Add gameState as dependency

  // Initialize peer connection and services
  useEffect(() => {
    let isInitialized = false;
    let stateListener;
    let connectionListener;
    let hostListener;
    let gameListener;
    let initializeAttempts = 0;
    const maxAttempts = 5;
    
    const initialize = async () => {
      try {
        if (isInitialized) return;
        if (initializeAttempts >= maxAttempts) return;
        
        initializeAttempts++;
        console.log(`Initialization attempt ${initializeAttempts}`);
        
        if (!peerConnection.peer || peerConnection.peer.disconnected) {
          await peerConnection.initialize({ nickname: playerName });
        }
        
        isInitialized = true;
        setConnectionStatus(CONNECTION_STATUS.CONNECTED);
        
        // Set up state change listener
        stateListener = (newState) => {
          console.log('Received state update:', newState);
          setGameState(newState);
        };
        stateManager.addStateListener(stateListener);

        // Set up connection status listener
        connectionListener = (event) => {
          if (event.type === 'status_change') {
            setConnectionStatus(event.status);
            
            // Handle reconnection
            if (event.status === CONNECTION_STATUS.DISCONNECTED) {
              setTimeout(() => {
                if (!isInitialized) {
                  initialize();
                }
              }, 3000);
            }
          }
        };
        peerConnection.addConnectionListener(connectionListener);

        // Set up host event listener
        hostListener = (event, data) => {
          switch (event) {
            case HOST_EVENTS.HOST_CHANGED:
              if (data.isLocalHost) {
                setTemporaryError('You are now the host of this game.');
              }
              break;
            case HOST_EVENTS.HOST_DISCONNECTED:
              setRecoveryMessage('Previous host disconnected. Electing new host...');
              break;
          }
        };
        hostManager.addHostEventListener(hostListener);

        // Set up game event listener
        gameListener = (event, data) => {
          switch (event) {
            case GAME_EVENTS.GAME_OVER:
              setGameState(prev => ({
                ...prev,
                status: GAME_STATUS.ENDED,
                winner: data.winner
              }));
              break;
          }
        };
        gameManager.addGameEventListener(gameListener);
        
      } catch (error) {
        console.error('Initialization error:', error);
        setError(`Failed to initialize game. ${initializeAttempts < maxAttempts ? 'Retrying...' : 'Please refresh the page.'}`);
        setConnectionStatus(CONNECTION_STATUS.ERROR);
        isInitialized = false;
        
        if (initializeAttempts < maxAttempts) {
          setTimeout(initialize, 2000);
        }
      }
    };

    // Start initialization
    initialize();

    // Return cleanup function
    return () => {
      if (stateListener) stateManager.removeStateListener(stateListener);
      if (connectionListener) peerConnection.removeConnectionListener(connectionListener);
      if (hostListener) hostManager.removeHostEventListener(hostListener);
      if (gameListener) gameManager.removeGameEventListener(gameListener);
      
      // Clean up managers in reverse order
      hostManager.cleanup();
      gameManager.cleanup();
      stateManager.cleanup();
      
      if (peerConnection.peer && !peerConnection.peer._destroyed) {
        peerConnection.cleanup(false);
      }
      
      isInitialized = false;
    };
  }, [playerName]);

  const setTemporaryError = (message, duration = 5000) => {
    setError(message);
    setTimeout(() => setError(null), duration);
  };

  const createRoom = async (settings) => {
    try {
      if (!playerName.trim()) {
        setError('Please enter your name');
        return;
      }

      setError(null);
      await peerConnection.initialize({ nickname: playerName });
      hostManager.initializeAsHost();
      
      const newRoomCode = peerConnection.peerId;
      setRoomCode(newRoomCode);
      
      stateManager.initialize({
        settings,
        status: GAME_STATUS.WAITING,
        teams: {
          team1: { name: 'Team 1', players: [], score: 0 },
          team2: { name: 'Team 2', players: [], score: 0 }
        },
        host: peerConnection.peerId,
        timestamp: Date.now(),
        currentPlayer: playerName
      });
      
    } catch (error) {
      console.error('Room creation error:', error);
      setError('Failed to create room. Please try again.');
    }
  };

  const joinRoom = async (roomCode) => {
    try {
      if (!playerName.trim()) {
        setError('Please enter your name');
        return;
      }

      setError(null); 
      // Convert room code to lowercase
      const normalizedRoomCode = roomCode.toLowerCase().trim();
      console.log('Initializing peer connection...');
      await peerConnection.initialize({ nickname: playerName });
      
      console.log('Connecting to room:', normalizedRoomCode);
      await peerConnection.connectTo(normalizedRoomCode);
      setRoomCode(normalizedRoomCode);

      // Wait for connection to establish
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create a promise that resolves when we get the state
      const statePromise = new Promise((resolve, reject) => {
        const stateTimeout = setTimeout(() => {
          reject(new Error('State sync timeout'));
        }, 5000);

        const messageHandler = (message, senderId) => {
          console.log('Received message during join:', message);
          if (message.type === 'stateResponse') {
            clearTimeout(stateTimeout);
            peerConnection.removeMessageListener(messageHandler);
            resolve(message.payload);
          }
        };

        peerConnection.addMessageListener(messageHandler);
      });

      // Request state and wait for response
      console.log('Requesting game state...');
      stateManager.requestState();
      
      const newState = await statePromise;
      console.log('Got state response:', newState);
      setGameState(newState);
      console.log('Successfully joined room and synced state');
      
    } catch (error) {
      console.error('Join room error:', error);
      setError('Failed to join room. Please check the code and try again.');
      peerConnection.cleanup();
    }
  };

  // Make sure state changes are logged
  useEffect(() => {
    console.log('Game state updated:', gameState);
  }, [gameState]);

  const joinTeam = (teamId) => {
    if (!gameState) {
      console.error('Cannot join team - no game state');
      return;
    }
    
    if (gameState.status !== GAME_STATUS.WAITING) {
      console.error('Cannot join team - game not in waiting state');
      return;
    }

    console.log('Joining team:', { teamId, playerName, currentState: gameState });

    // Create new team state
    const updatedTeams = {
      ...gameState.teams,
      [teamId]: {
        ...gameState.teams[teamId],
        players: [...gameState.teams[teamId].players, playerName]
      }
    };

    // Remove from other team if necessary
    const otherTeamId = teamId === 'team1' ? 'team2' : 'team1';
    if (gameState.teams[otherTeamId].players.includes(playerName)) {
      updatedTeams[otherTeamId] = {
        ...gameState.teams[otherTeamId],
        players: gameState.teams[otherTeamId].players.filter(p => p !== playerName)
      };
    }

    // Send team update message
    peerConnection.broadcast({
      type: 'teamUpdate',
      payload: {
        teams: updatedTeams,
        player: playerName,
        timestamp: Date.now()
      }
    });

    // Update local state
    const newState = {
      ...gameState,
      teams: updatedTeams,
      timestamp: Date.now()
    };

    console.log('Updating state to:', newState);
    setGameState(newState);
    stateManager.updateState({ teams: updatedTeams }, true);
  };

  // Add team update message handler in useEffect
  useEffect(() => {
    const handleTeamUpdate = (message, senderId) => {
      if (message.type === 'teamUpdate') {
        console.log('Received team update:', message.payload);
        const newState = {
          ...gameState,
          teams: message.payload.teams,
          timestamp: message.payload.timestamp
        };
        setGameState(newState);
      }
    };

    peerConnection.addMessageListener(handleTeamUpdate);
    return () => peerConnection.removeMessageListener(handleTeamUpdate);
  }, [gameState]);

  const startGame = () => {
    if (!gameState) {
      console.error('Cannot start game - no game state');
      return;
    }

    if (gameState.status !== GAME_STATUS.WAITING) {
      console.error('Cannot start game - wrong status:', gameState.status);
      return;
    }

    if (!hostManager.isHost) {
      console.error('Cannot start game - not host');
      return;
    }

    console.log('Starting game...');
    try {
      const success = gameManager.startGame();
      if (!success) {
        setError('Failed to start game. Please ensure there are players in both teams.');
      }
    } catch (error) {
      console.error('Error starting game:', error);
      setError('Failed to start game: ' + error.message);
    }
  };

  const renderGamePhase = () => {
    console.log('Rendering game phase:', { gameState, roomCode });
    
    if (!gameState || (gameState.status === GAME_STATUS.WAITING && !gameState.host)) {
      return (
        <SetupScreen 
          onCreateRoom={createRoom} 
          onJoinRoom={joinRoom}
          onNameChange={setPlayerName}
          playerName={playerName}
        />
      );
    }

    switch (gameState.status) {
      case GAME_STATUS.WAITING:
        return (
          <TeamSelection
            teams={gameState.teams}
            onJoinTeam={joinTeam}
            onStartGame={startGame}
            isHost={hostManager.isHost}
            roomCode={roomCode}
            currentPlayerName={playerName}
          />
        );
      
      case GAME_STATUS.PLAYING:
        return (
          <GameRoom
            gameState={gameState}
            isHost={hostManager.isHost}
            onGuess={(guess) => gameManager.handleGuess({ guess })}
          />
        );
      
      case GAME_STATUS.ENDED:
        return (
          <Card className="max-w-md mx-auto mt-8 p-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
            <p className="text-lg">
              Winner: {gameState.teams[gameState.winner]?.name || 'Unknown'}
            </p>
          </Card>
        );
    }
  };

  console.log('Rendering TabooGame', { gameState, connectionStatus });
  
  return (
    <div className="min-h-screen bg-gray-100 p-4" data-testid="game-container">
      <h1 className="text-2xl font-bold text-center mb-4">Taboo Game</h1>
      
      {error && (
        <div className="max-w-md mx-auto mb-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" data-testid="error-message">
          {error}
        </div>
      )}

      {gameState?.host && (
        <div className="max-w-md mx-auto mb-4" data-testid="host-info">
          <HostIndicator
            hostId={gameState.host}
            isCurrentPeer={hostManager.isHost}
            nickname={playerName}
          />
        </div>
      )}

      <AlertDialog open={!!recoveryMessage}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Game State Recovery</AlertDialogTitle>
            <AlertDialogDescription>{recoveryMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setRecoveryMessage(null)}>
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div data-testid="game-phase">
        {renderGamePhase()}
      </div>

      <ConnectionStatus status={connectionStatus} data-testid="connection-status" />
    </div>
  );
};

export default TabooGame;
