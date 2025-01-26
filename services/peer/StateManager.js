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
    this.pendingUpdates = new Map();
    this.stateListeners = new Set();
    this.lastBackupTimestamp = 0;
    this.MAX_RETRIES = 3;
    this.RETRY_DELAY = 1000;
    
    this.peerConnection.addMessageListener(this.handleStateMessage.bind(this));
  }

  /**
   * Wait for a specific state condition
   * @param {Function} predicate - Function that returns true when desired state is reached
   * @param {number} timeout - Maximum time to wait in milliseconds
   * @returns {Promise<Object>} Resolved with state when condition is met
   */
  waitForStateCondition(predicate, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = 100; // Check every 100ms
      
      const check = () => {
        if (this.gameState) {
          console.log('[StateManager] Checking state condition:', this.gameState);
          if (predicate(this.gameState)) {
            console.log('[StateManager] State condition met');
            resolve(this.gameState);
            return;
          }
        }

        if (Date.now() - startTime > timeout) {
          console.error('[StateManager] State condition timeout:', {
            currentState: this.gameState,
            elapsedTime: Date.now() - startTime
          });
          reject(new Error('Timeout waiting for state condition'));
          return;
        }

        setTimeout(check, checkInterval);
      };

      check();
    });
  }

  /**
   * Initialize the state manager with better validation
   * @param {Object} initialState - Initial game state (if any)
   */
  initialize(initialState = null) {
    console.log('[StateManager] Initializing with state:', initialState);
    
    if (initialState && this.validateState(initialState)) {
      this.gameState = initialState;
      this.stateVersion = initialState.timestamp || Date.now();
      console.log('[StateManager] State initialized:', this.gameState);
    }
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
    console.log('[StateManager] Received message:', { type: data.type, senderId });
    
    if (!data.type) return;

    switch (data.type) {
      case 'stateResponse':
        console.log('[StateManager] Processing state response from:', senderId);
        if (this.validateState(data.payload)) {
          // Always accept state responses if they're valid
          this.gameState = { ...data.payload };
          this.stateVersion = data.payload.timestamp;
          console.log('[StateManager] Applied state from response:', this.gameState);
          this.notifyListeners();
        } else {
          console.warn('[StateManager] Invalid state response rejected:', data.payload);
        }
        break;

      case 'stateRequest':
        if (this.gameState) {
          console.log('[StateManager] Got state request from:', senderId);
          this.peerConnection.sendToPeer(senderId, {
            type: 'stateResponse',
            payload: { ...this.gameState }
          });
          console.log('[StateManager] Sent state response to:', senderId);
        }
        break;

      case 'stateUpdate':
      case 'gameStart':
        console.log('[StateManager] Processing state update:', data.payload);
        if (this.validateState(data.payload)) {
          if (!this.gameState || senderId === this.gameState.host || data.payload.timestamp > this.stateVersion) {
            this.gameState = { ...data.payload };
            this.stateVersion = data.payload.timestamp;
            console.log('[StateManager] Applied state update:', this.gameState);
            this.notifyListeners();
          }
        }
        break;
    }
  }

  applyState(newState, senderId) {
    // Only accept updates from host or if we don't have a state yet
    if (!this.gameState || senderId === this.gameState.host || senderId === this.peerConnection.peerId) {
      if (!this.gameState || newState.timestamp > this.stateVersion) {
        const oldState = this.gameState;
        this.gameState = { ...newState };
        this.stateVersion = newState.timestamp;
        
        console.log('[StateManager] State updated:', {
          from: oldState?.timestamp,
          to: newState.timestamp,
          source: senderId
        });
        
        this.notifyListeners();
        return true;
      } else {
        console.log('[StateManager] Ignored outdated state update:', {
          current: this.stateVersion,
          received: newState.timestamp
        });
      }
    } else {
      console.warn('[StateManager] Rejected state update from non-host:', senderId);
    }
    return false;
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
      console.warn('[StateManager] Validation failed: state is null');
      return false;
    }

    // Check required fields
    const requiredFields = ['settings', 'status', 'teams', 'host', 'timestamp'];
    const missingFields = requiredFields.filter(field => !(field in state));
    
    if (missingFields.length > 0) {
      console.warn('[StateManager] Validation failed: missing fields:', missingFields);
      return false;
    }

    // Validate teams structure
    if (!state.teams?.team1 || !state.teams?.team2) {
      console.warn('[StateManager] Validation failed: invalid teams structure');
      return false;
    }

    // Validate timestamp
    if (typeof state.timestamp !== 'number' || state.timestamp <= 0) {
      console.warn('[StateManager] Validation failed: invalid timestamp');
      return false;
    }

    console.log('[StateManager] State validation passed');
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
    if (!this.gameState) {
      console.log('[StateManager] No state to broadcast');
      return;
    }

    console.log('[StateManager] Broadcasting state:', this.gameState);
    this.peerConnection.broadcast({
      type: 'stateUpdate',
      payload: this.gameState
    });
  }

  /**
   * Request state from connected peers
   */
  requestState() {
    console.log('[StateManager] Starting state request');
    return new Promise((resolve, reject) => {
      let retryCount = 0;
      let timeoutId = null;

      const handleResponse = (data, senderId) => {
        if (data.type === 'stateResponse' && this.validateState(data.payload)) {
          clearTimeout(timeoutId);
          this.peerConnection.removeMessageListener(handleResponse);
          this.gameState = { ...data.payload };
          this.stateVersion = data.payload.timestamp;
          this.notifyListeners();
          resolve(this.gameState);
        }
      };

      const sendRequest = () => {
        if (retryCount >= this.MAX_RETRIES) {
          this.peerConnection.removeMessageListener(handleResponse);
          reject(new Error('Failed to get state after max retries'));
          return;
        }

        console.log(`[StateManager] Sending state request (attempt ${retryCount + 1})`);
        this.peerConnection.addMessageListener(handleResponse);
        
        this.peerConnection.broadcast({
          type: 'stateRequest',
          payload: {
            requestId: Date.now().toString(),
            currentVersion: this.stateVersion,
            requesterId: this.peerConnection.peerId
          }
        });

        retryCount++;
        timeoutId = setTimeout(() => {
          console.log(`[StateManager] State request attempt ${retryCount} timed out`);
          sendRequest();
        }, this.RETRY_DELAY);
      };

      sendRequest();
    });
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
    console.log('[StateManager] Notifying listeners of state:', this.gameState);
    this.stateListeners.forEach(listener => {
      try {
        listener(this.gameState);
      } catch (error) {
        console.error('[StateManager] Error in state listener:', error);
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
