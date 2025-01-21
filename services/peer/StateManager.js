// services/peer/StateManager.js
import { MESSAGE_TYPES } from './types';

// State validation schema
const STATE_SCHEMA = {
  required: ['settings', 'status', 'teams', 'host', 'timestamp'],
  types: {
    settings: 'object',
    status: 'string',
    teams: 'object',
    host: 'string',
    timestamp: 'number'
  }
};

class StateManager {
  constructor(peerConnection) {
    this.peerConnection = peerConnection;
    this.gameState = null;
    this.stateVersion = 0;
    this.pendingUpdates = new Map(); // Track updates that need confirmation
    this.stateListeners = new Set();
    this.lastBackupTimestamp = 0;
    
    // Set up message listener for state-related messages
    this.peerConnection.addMessageListener(this.handleStateMessage.bind(this));
  }

  /**
   * Wait for a specific state condition
   * @param {Function} predicate - Function that returns true when desired state is reached
   * @param {number} timeout - Maximum time to wait in milliseconds
   * @returns {Promise<Object>} Resolved with state when condition is met
   */
  async waitForStateCondition(predicate, timeout = 5000) {
    const startTime = Date.now();
    const checkInterval = 50; // Check every 50ms
    
    return new Promise((resolve, reject) => {
      const checkState = () => {
        if (this.gameState && predicate(this.gameState)) {
          resolve(this.gameState);
          return;
        }

        if (Date.now() - startTime > timeout) {
          console.error('Current state:', this.gameState);
          reject(new Error('Timeout waiting for state condition'));
          return;
        }

        // Check again after interval
        setTimeout(checkState, checkInterval);
      };

      checkState();
    });
  }

  /**
   * Initialize the state manager with better validation
   * @param {Object} initialState - Initial game state (if any)
   */
  initialize(initialState = null) {
    // If we already have a state and no new state is provided, keep current state
    if (this.gameState && !initialState) {
      return;
    }

    if (initialState && this.validateState(initialState)) {
      this.gameState = initialState;
      this.stateVersion = initialState.timestamp || Date.now();
    } else {
      this.gameState = this.createInitialState();
    }
    
    // Always broadcast initial state
    this.broadcastState();
    this.notifyListeners();
  }

  /**
   * Create initial game state
   * @private
   */
  createInitialState() {
    return {
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
      host: this.peerConnection.peerId,
      timestamp: Date.now(),
      currentTurn: null,
      currentWord: null
    };
  }

  /**
   * Handle incoming state-related messages
   * @private
   */
  handleStateMessage(data, senderId) {
    console.log('StateManager received message:', { data, senderId });
    
    if (!data.type) return;

    switch (data.type) {
      case 'stateRequest':
        this.handleStateRequest(data.payload, senderId);
        break;
      case 'stateResponse':
        this.handleStateResponse(data.payload, senderId);
        break;
      case 'stateUpdate':
        this.handleStateUpdate(data.payload, senderId);
        break;
      case 'gameStart':
        this.handleGameStart(data.payload, senderId);
        break;
    }
  }

  /**
   * Handle incoming state updates
   * @private
   */
  handleStateUpdate(newState, senderId) {
    if (!this.validateState(newState)) {
      console.error('Received invalid state update from:', senderId);
      return;
    }

    // Only accept updates from the host or if we don't have a state yet
    if (senderId === this.gameState?.host || !this.gameState) {
      if (newState.timestamp > (this.gameState?.timestamp || 0)) {
        this.gameState = newState;
        this.stateVersion = newState.timestamp;
        this.notifyListeners();
      }
    }
  }

  handleGameStart(state, senderId) {
    console.log('Handling game start:', state);
    // Only accept game start from host
    if (senderId === this.gameState?.host) {
      this.gameState = state;
      this.stateVersion = state.timestamp;
      this.notifyListeners();
      console.log('Updated state for game start');
    } else {
      console.warn('Ignored game start from non-host:', senderId);
    }
  }

  /**
   * Handle state request from other peers
   * @private
   */
  handleStateRequest(payload, senderId) {
    console.log('Handling state request from:', senderId);
    console.log('Current state:', this.gameState);
    
    if (this.gameState) {
      this.peerConnection.sendToPeer(senderId, {
        type: 'stateResponse',
        payload: this.gameState
      });
      console.log('Sent state response to:', senderId);
    } else {
      console.log('No state to send');
    }
  }

  /**
   * Handle state response from other peers
   * @private
   */
  handleStateResponse(state, senderId) {
    console.log('Handling state response from:', senderId, state);
    
    if (this.validateState(state)) {
      this.gameState = state;
      this.stateVersion = state.timestamp;
      this.notifyListeners();
      console.log('Updated state from response');
    } else {
      console.error('Invalid state received in response');
    }
  }

  /**
   * Enhanced state validation with better error logging
   * @private
   */
  validateState(state) {
    if (!state) {
      console.error('Validation failed: state is null or undefined');
      return false;
    }

    console.log('Validating state:', state);

    // Check required fields
    for (const field of ['settings', 'status', 'teams', 'host', 'timestamp']) {
      if (!(field in state)) {
        console.error(`Validation failed: missing required field ${field}`);
        return false;
      }
    }

    // Validate teams structure
    if (!state.teams?.team1 || !state.teams?.team2) {
      console.error('Validation failed: invalid teams structure');
      return false;
    }

    return true;
  }

  /**
   * Update game state
   * @param {Object} updates - State updates to apply
   * @param {boolean} broadcast - Whether to broadcast the update to other peers
   */
  updateState(updates, broadcast = true) {
    if (!this.gameState) return false;

    const newState = {
      ...this.gameState,
      ...updates,
      timestamp: Date.now()
    };

    if (!this.validateState(newState)) {
      console.error('Invalid state update:', updates);
      return false;
    }

    this.gameState = newState;
    this.stateVersion = newState.timestamp;

    if (broadcast) {
      this.broadcastState();
    }

    this.notifyListeners();
    return true;
  }

  /**
   * Broadcast current state to all peers
   */
  broadcastState() {
    if (!this.gameState) return;

    this.peerConnection.broadcast({
      type: MESSAGE_TYPES.STATE_UPDATE,
      payload: this.gameState
    });
  }

  /**
   * Request state from connected peers
   */
  requestState() {
    console.log('Requesting state from peers');
    const request = {
      type: 'stateRequest',
      payload: {
        currentVersion: this.stateVersion,
        requesterId: this.peerConnection.peerId
      }
    };
    console.log('Broadcasting state request:', request);
    this.peerConnection.broadcast(request);
  }

  /**
   * Add state change listener
   * @param {Function} listener - The listener function
   */
  addStateListener(listener) {
    this.stateListeners.add(listener);
    if (this.gameState) {
      listener(this.gameState);
    }
  }

  /**
   * Remove state change listener
   * @param {Function} listener - The listener function to remove
   */
  removeStateListener(listener) {
    this.stateListeners.delete(listener);
  }

  /**
   * Notify all state listeners
   * @private
   */
  notifyListeners() {
    this.stateListeners.forEach(listener => {
      try {
        listener(this.gameState);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  /**
   * Get current game state
   * @returns {Object} Current game state
   */
  getState() {
    return this.gameState;
  }

  /**
   * Handle local backup of state
   * @private
   */
  backupState() {
    if (!this.gameState) return;
    
    const now = Date.now();
    // Only backup every 5 seconds
    if (now - this.lastBackupTimestamp > 5000) {
      try {
        localStorage.setItem('gameStateBackup', JSON.stringify({
          state: this.gameState,
          timestamp: now
        }));
        this.lastBackupTimestamp = now;
      } catch (error) {
        console.error('Failed to backup state:', error);
      }
    }
  }

  /**
   * Restore state from local backup
   * @returns {boolean} Whether restoration was successful
   */
  restoreFromBackup() {
    try {
      const backup = localStorage.getItem('gameStateBackup');
      if (backup) {
        const { state, timestamp } = JSON.parse(backup);
        if (Date.now() - timestamp < 3600000) { // Only restore if backup is less than 1 hour old
          this.gameState = state;
          this.stateVersion = state.timestamp;
          this.notifyListeners();
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to restore state from backup:', error);
    }
    return false;
  }

  /**
   * Clean up state manager
   */
  cleanup() {
    this.backupState(); // Save final state
    this.gameState = null;
    this.stateVersion = 0;
    this.pendingUpdates.clear();
    this.stateListeners.clear();
  }
}

export default StateManager;
