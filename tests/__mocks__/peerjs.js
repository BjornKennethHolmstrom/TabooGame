// __mocks__/peerjs.js

// Mock connection store for simulating peer connections
const connections = new Map();
const states = new Map();
const connectionCallbacks = new Map();

class MockConnection {
  constructor(peer, options = {}) {
    this.peer = peer;
    this.open = true;
    this.metadata = options.metadata || {};
    // Reference callbacks from the global store
    const callbackKey = `${this.metadata.peerId || 'unknown'}-${this.peer}`;
    connectionCallbacks.set(callbackKey, {
      data: () => {},
      open: () => {},
      close: () => {},
      error: () => {}
    });
    console.log(`MockConnection created for peer ${peer} with key ${callbackKey}`);
  }

  on(event, callback) {
    const callbackKey = `${this.metadata.peerId || 'unknown'}-${this.peer}`;
    const callbacks = connectionCallbacks.get(callbackKey);
    if (callbacks) {
      callbacks[event] = callback;
      if (event === 'open' && this.open) {
        setTimeout(() => callback(), 10);
      }
    }
  }

  send(data) {
    console.log(`Sending message from ${this.metadata.nickname || 'unknown'} to ${this.peer}:`, data);

    if (data.type === 'stateUpdate') {
      console.log('Storing state:', data.payload);
      states.set(this.peer, data.payload);
      states.set('global', data.payload);
    }
    else if (data.type === 'stateRequest') {
      const state = states.get('global');
      console.log('Responding to state request with state:', state);
      
      // Get the remote connection's callbacks
      const reverseCallbackKey = `${this.peer}-${this.metadata.peerId}`;
      const remoteCallbacks = connectionCallbacks.get(reverseCallbackKey);
      
      if (remoteCallbacks?.data) {
        setTimeout(() => {
          remoteCallbacks.data({
            type: 'stateResponse',
            payload: state
          });
        }, 10);
      }
    }

    // Forward the message
    const reverseCallbackKey = `${this.peer}-${this.metadata.peerId}`;
    const remoteCallbacks = connectionCallbacks.get(reverseCallbackKey);
    if (remoteCallbacks?.data) {
      setTimeout(() => remoteCallbacks.data(data), 10);
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
    // Immediately call 'open' callback
    setTimeout(() => {
      if (this.callbacks['open']) {
        this.callbacks['open'](this.id);
      }
    }, 0);
    this.connections = new Map();
    this.callbacks = {};
    this.destroyed = false;
    this.disconnected = false;
    
    connections.set(this.id, this);
    console.log(`MockPeer created with ID ${this.id}`);
  }

  on(event, callback) {
    this.callbacks[event] = callback;
    if (event === 'open') {
      setTimeout(() => callback(this.id), 10);
    }
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
      }, 10);
    }

    return connection;
  }

  destroy() {
    console.log(`Destroying peer ${this.id}`);
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
      setTimeout(() => this.callbacks['open'](this.id), 10);
    }
  }
}

// Clear stores between tests
export const clearStores = () => {
  connections.clear();
  states.clear();
  connectionCallbacks.clear();
};
