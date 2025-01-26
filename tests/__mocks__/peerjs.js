// __mocks__/peerjs.js

// Mock stores for network simulation
const connections = new Map();
const states = new Map();
const connectionCallbacks = new Map();

// Debug helper
const logState = (message, id) => {
  console.log(`[MockPeerJS] ${message}:`, {
    global: states.get('global'),
    peer: id ? states.get(id) : undefined
  });
};

class MockConnection {
  constructor(peer, options = {}) {
    this.peer = peer;
    this.open = true;
    this.metadata = options.metadata || {};
    this.peerId = options.metadata.peerId;
    this.dataCallbacks = new Set();
    
    const callbackKey = `${this.metadata.peerId || 'unknown'}-${this.peer}`;
    connectionCallbacks.set(callbackKey, {
      data: (data) => this.handleData(data),
      open: () => {},
      close: () => {},
      error: () => {}
    });
    console.log(`[MockConnection] Created for peer ${peer} with key ${callbackKey}`);
  }

  handleData(data) {
    console.log(`[MockConnection] Handling data:`, data);
    this.dataCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[MockConnection] Error in data callback:', error);
      }
    });
  }

  on(event, callback) {
    if (event === 'data') {
      this.dataCallbacks.add(callback);
    }
    const callbackKey = `${this.metadata.peerId || 'unknown'}-${this.peer}`;
    const callbacks = connectionCallbacks.get(callbackKey);
    if (callbacks) {
      callbacks[event] = callback;
      if (event === 'open' && this.open) {
        console.log(`[MockConnection] Triggering immediate open callback for ${callbackKey}`);
        setTimeout(() => callback(), 0);
      }
    }
  }

  send(data) {
    console.log(`[MockConnection] Sending message from ${this.metadata.nickname || 'unknown'} to ${this.peer}:`, data);

    const reverseCallbackKey = `${this.peer}-${this.metadata.peerId}`;
    const remoteCallbacks = connectionCallbacks.get(reverseCallbackKey);

    if (!remoteCallbacks?.data) {
      console.warn('[MockConnection] No remote callbacks found for', reverseCallbackKey);
      return;
    }

    if (data.type === 'stateRequest') {
      console.log('[MockConnection] Processing state request');
      // First check peer-specific state
      let currentState = states.get(this.peer);
      if (!currentState) {
        // Fall back to global state
        currentState = states.get('global');
      }

      logState('Current state when processing request', this.peer);

      if (currentState) {
        console.log('[MockConnection] Found state to send:', currentState);
        const stateResponse = {
          type: 'stateResponse',
          payload: { ...currentState }
        };
        remoteCallbacks.data(stateResponse);
        console.log('[MockConnection] State response sent synchronously');
      } else {
        console.warn('[MockConnection] No state available to send for request');
      }
    } else if (data.type === 'stateUpdate' || data.type === 'gameStart') {
      console.log('[MockConnection] Processing state update:', data.payload);
      // Store state globally and for specific peer
      const newState = { ...data.payload };
      states.set('global', newState);
      states.set(this.peer, newState);

      logState('State after update', this.peer);
      
      // Forward state update immediately
      remoteCallbacks.data(data);
      console.log('[MockConnection] State update forwarded synchronously');
    } else if (data.type === 'stateResponse') {
      console.log('[MockConnection] Processing state response:', data.payload);
      // Store received state
      const newState = { ...data.payload };
      states.set(this.metadata.peerId, newState);
      remoteCallbacks.data(data);
      console.log('[MockConnection] State response processed');
    } else if (data.type === 'hostHeartbeat') {
      // Forward heartbeats normally
      remoteCallbacks.data(data);
    } else {
      // Handle other messages
      console.log('[MockConnection] Forwarding other message type:', data.type);
      remoteCallbacks.data(data);
    }
  }

  close() {
    this.open = false;
    const callbackKey = `${this.metadata.peerId || 'unknown'}-${this.peer}`;
    const callbacks = connectionCallbacks.get(callbackKey);
    if (callbacks?.close) {
      callbacks.close();
    }
    connectionCallbacks.delete(callbackKey);
  }
}

export default class MockPeer {
  constructor() {
    this.id = 'peer-' + Math.random().toString(36).substr(2, 9);
    this.connections = new Map();
    this.callbacks = {};
    this.destroyed = false;
    this.disconnected = false;
    
    connections.set(this.id, this);
    
    setTimeout(() => {
      if (this.callbacks['open']) {
        this.callbacks['open'](this.id);
      }
    }, 0);
  }

  connect(remotePeerId, options = {}) {
    console.log(`${this.id} connecting to ${remotePeerId}`);
    const connection = new MockConnection(remotePeerId, {
      ...options,
      metadata: {
        ...options.metadata,
        peerId: this.id
      }
    });
    
    this.connections.set(remotePeerId, connection);
    
    const remotePeer = connections.get(remotePeerId);
    if (remotePeer && remotePeer.callbacks['connection']) {
      const reverseConnection = new MockConnection(this.id, {
        ...options,
        metadata: {
          ...options.metadata,
          peerId: remotePeerId
        }
      });
      setTimeout(() => {
        remotePeer.callbacks['connection'](reverseConnection);
      }, 0);
    }

    return connection;
  }

  on(event, callback) {
    this.callbacks[event] = callback;
    if (event === 'open') {
      setTimeout(() => callback(this.id), 0);
    }
  }

  destroy() {
    this.destroyed = true;
    this.disconnected = true;
    
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
    
    connections.delete(this.id);
    states.delete(this.id);
  }

  disconnect() {
    this.disconnected = true;
    if (this.callbacks['disconnected']) {
      this.callbacks['disconnected']();
    }
  }

  reconnect() {
    if (this.destroyed) {
      throw new Error('Cannot reconnect destroyed peer');
    }
    this.disconnected = false;
    if (this.callbacks['open']) {
      setTimeout(() => this.callbacks['open'](this.id), 0);
    }
  }
}

// Clear stores between tests
export const clearStores = () => {
  console.log('[MockPeerJS] Clearing stores');
  connections.clear();
  states.clear();
  connectionCallbacks.clear();
};

