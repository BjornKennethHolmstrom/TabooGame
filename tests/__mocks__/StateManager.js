// tests/__mocks__/StateManager.js

class MockStateManager {
  constructor(peerConnection) {
    this.peerConnection = peerConnection;
    this.gameState = null;
    this.stateVersion = 0;
    this.stateListeners = new Set();
    console.log(`MockStateManager created for peer ${peerConnection.peerId}`);
  }

  initialize(initialState = null) {
    console.log('Initializing state:', initialState);
    if (initialState) {
      this.gameState = initialState;
      this.stateVersion = initialState.timestamp || Date.now();
      this.notifyListeners();
      
      // Broadcast initial state
      if (this.peerConnection) {
        console.log('Broadcasting initial state');
        this.peerConnection.broadcast({
          type: 'stateUpdate',
          payload: initialState
        });
      }
    }
  }

  requestState() {
    console.log('Requesting state');
    this.peerConnection.broadcast({
      type: 'stateRequest',
      payload: {
        currentVersion: this.stateVersion
      }
    });
  }

  handleStateResponse(state) {
    console.log('Received state response:', state);
    if (state && (!this.gameState || state.timestamp > this.stateVersion)) {
      this.gameState = state;
      this.stateVersion = state.timestamp;
      this.notifyListeners();
    }
  }

  updateState(updates, broadcast = true) {
    console.log('Updating state:', updates);
    if (!this.gameState) {
      console.log('No initial state to update');
      return false;
    }

    const newState = {
      ...this.gameState,
      ...updates,
      timestamp: Date.now()
    };

    this.gameState = newState;
    this.stateVersion = newState.timestamp;

    if (broadcast) {
      this.peerConnection.broadcast({
        type: 'stateUpdate',
        payload: newState
      });
    }

    this.notifyListeners();
    return true;
  }

  getState() {
    return this.gameState;
  }

  addStateListener(listener) {
    this.stateListeners.add(listener);
    if (this.gameState) {
      listener(this.gameState);
    }
  }

  removeStateListener(listener) {
    this.stateListeners.delete(listener);
  }

  notifyListeners() {
    console.log('Notifying listeners with state:', this.gameState);
    this.stateListeners.forEach(listener => {
      try {
        listener(this.gameState);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  cleanup() {
    this.gameState = null;
    this.stateVersion = 0;
    this.stateListeners.clear();
  }
}

export default MockStateManager;
