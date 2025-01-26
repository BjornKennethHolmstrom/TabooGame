// services/peer/PeerConnection.js
import Peer from 'peerjs';
import { CONNECTION_STATUS, MESSAGE_TYPES } from './types';

class PeerConnection {
  constructor() {
    this.peer = null;
    this.connections = new Map();
    this.connectionListeners = new Set();
    this.messageListeners = new Set();
    this.connectionStatus = CONNECTION_STATUS.CONNECTING;
    this.peerId = null;
    this.metadata = {};
    this.initializePromise = null;
    this.reconnectTimeout = null;
    this.isDestroying = false;
  }

  generatePeerId() {
    // Generate a simple ID with only lowercase letters and numbers
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Initialize the peer connection
   * @param {Object} metadata - Metadata about this peer (nickname, etc.)
   * @returns {Promise<string>} Peer ID
   */
  async initialize(metadata = {}) {
    if (this.peer && !this.peer.disconnected) {
      return this.peerId;
    }

    // Clean up any existing peer
    this.cleanup();

    return new Promise((resolve, reject) => {
      try {
        this.metadata = metadata;
        
        // Generate a simple peer ID
        const peerId = this.generatePeerId();
        console.log('Initializing peer with ID:', peerId);
        
        this.peer = new Peer(peerId, {
          debug: 2, // Increased debug level to help with troubleshooting
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        this.peer.on('open', (id) => {
          console.log('Peer opened with ID:', id);
          this.peerId = id;
          this.connectionStatus = CONNECTION_STATUS.CONNECTED;
          resolve(id);
        });

        this.peer.on('connection', this.handleIncomingConnection.bind(this));
        
        this.peer.on('error', (error) => {
          console.error('Peer error:', error);
          this.handlePeerError(error);
          if (this.connectionStatus === CONNECTION_STATUS.CONNECTING) {
            reject(error);
          }
        });

        this.peer.on('disconnected', () => {
          console.log('Peer disconnected');
          this.handleDisconnection();
        });

        // Add timeout for initial connection
        setTimeout(() => {
          if (this.connectionStatus === CONNECTION_STATUS.CONNECTING) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      } catch (error) {
        console.error('Initialization error:', error);
        reject(error);
      }
    });
  }

  /**
   * Connect to another peer
   * @param {string} remotePeerId - The ID of the peer to connect to
   * @returns {Promise<void>}
   */
  async connectTo(remotePeerId) {
    console.log('Attempting to connect to:', remotePeerId);
    
    if (!this.peer || this.peer.disconnected) {
      throw new Error('Peer is not connected');
    }

    return new Promise((resolve, reject) => {
      try {
        const connection = this.peer.connect(remotePeerId, {
          reliable: true,
          metadata: {
            ...this.metadata,
            peerId: this.peerId,
            timestamp: Date.now()
          }
        });

        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        connection.on('open', () => {
          clearTimeout(timeout);
          console.log('Connection established with:', remotePeerId);
          this.handleIncomingConnection(connection);
          resolve(connection);
        });

        connection.on('error', (error) => {
          clearTimeout(timeout);
          console.error('Connection error:', error);
          reject(error);
        });

      } catch (error) {
        console.error('Connection attempt failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle a new incoming connection
   * @private
   */
  handleIncomingConnection(connection) {
    console.log('[PeerConnection] Handling incoming connection from:', connection.peer);
    
    // Store the connection
    this.connections.set(connection.peer, connection);

    // Set up immediate message handler
    connection.on('data', (data) => {
      console.log('[PeerConnection] Got data from connection:', data);
      this.handleIncomingMessage(data, connection.peer);
    });

    // Set up other handlers
    connection.on('close', () => {
      this.connections.delete(connection.peer);
      this.notifyConnectionListeners({
        type: 'peer_disconnected',
        peerId: connection.peer
      });
    });

    connection.on('error', (error) => {
      console.error(`[PeerConnection] Connection error with peer ${connection.peer}:`, error);
      this.notifyConnectionListeners({
        type: 'peer_error',
        peerId: connection.peer,
        error
      });
    });

    // Notify listeners of new connection
    this.notifyConnectionListeners({
      type: 'peer_connected',
      peerId: connection.peer,
      metadata: connection.metadata
    });
  }

  /**
   * Handle incoming messages from peers
   * @private
   */
  handleIncomingMessage(data, senderId) {
    console.log('[PeerConnection] Processing incoming message:', { data, senderId });
    
    // Notify all message listeners
    this.messageListeners.forEach(listener => {
      try {
        listener(data, senderId);
      } catch (error) {
        console.error('[PeerConnection] Error in message listener:', error);
      }
    });
  }

  /**
   * Handle peer errors
   * @private
   */
  handlePeerError(error) {
    console.error('Peer error:', error);
    this.updateConnectionStatus(CONNECTION_STATUS.ERROR, error);

    if (error.type === 'network' || error.type === 'disconnected') {
      this.handleDisconnection();
    }
  }

  /**
   * Handle connection errors
   * @private
   */
  handleConnectionError(error, peerId) {
    console.error(`Connection error with peer ${peerId}:`, error);
    this.notifyConnectionListeners({
      type: 'peer_error',
      peerId,
      error
    });
  }

  /**
   * Handle connection closures
   * @private
   */
  handleConnectionClosed(peerId) {
    this.connections.delete(peerId);
    this.notifyConnectionListeners({
      type: 'peer_disconnected',
      peerId
    });
  }

  /**
   * Handle peer disconnection
   * @private
   */
  handleDisconnection() {
    if (this.isDestroying) return;
    
    // Only handle disconnection if we're not already disconnected
    if (this.connectionStatus !== CONNECTION_STATUS.DISCONNECTED) {
      this.updateConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      
      // Clear existing timeout if any
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      // Only attempt reconnection if we have a valid peer and we're not destroying
      if (this.peer && !this.peer._destroyed && !this.isDestroying) {
        this.updateConnectionStatus(CONNECTION_STATUS.RECONNECTING);
        this.reconnectTimeout = setTimeout(() => {
          if (this.peer && !this.peer._destroyed && !this.isDestroying) {
            try {
              // Don't create a new peer, just try to reconnect the existing one
              this.peer.reconnect();
            } catch (error) {
              console.error('Reconnection failed:', error);
              // Don't trigger cleanup here, just update status
              this.updateConnectionStatus(CONNECTION_STATUS.ERROR);
            }
          }
        }, 1000);
      }
    }
  }

  /**
   * Update connection status and notify listeners
   * @private
   */
  updateConnectionStatus(status, error = null) {
    this.connectionStatus = status;
    this.notifyConnectionListeners({ type: 'status_change', status, error });
  }

  /**
   * Send a message to a specific peer
   * @param {string} peerId - The ID of the peer to send to
   * @param {any} data - The data to send
   * @returns {boolean} - Whether the send was successful
   */
  sendToPeer(peerId, data) {
    console.log(`Sending message to ${peerId}:`, data);
    const connection = this.connections.get(peerId);
    if (connection && connection.open) {
      connection.send(data);
      return true;
    }
    console.warn(`Failed to send message to ${peerId} - no open connection`);
    return false;
  }

  /**
   * Broadcast a message to all connected peers
   * @param {any} data - The data to broadcast
   */
  broadcast(data) {
    console.log('Broadcasting message:', data);
    this.connections.forEach((connection, peerId) => {
      if (connection.open) {
        console.log(`Sending to peer ${peerId}`);
        connection.send(data);
      }
    });
  }

  /**
   * Add a connection status listener
   * @param {Function} listener - The listener function
   */
  addConnectionListener(listener) {
    this.connectionListeners.add(listener);
  }

  /**
   * Remove a connection status listener
   * @param {Function} listener - The listener function to remove
   */
  removeConnectionListener(listener) {
    this.connectionListeners.delete(listener);
  }

  /**
   * Add a message listener
   * @param {Function} listener - The listener function
   */
  addMessageListener(listener) {
    this.messageListeners.add(listener);
  }

  /**
   * Remove a message listener
   * @param {Function} listener - The listener function to remove
   */
  removeMessageListener(listener) {
    this.messageListeners.delete(listener);
  }

  /**
   * Notify all connection listeners of an event
   * @private
   */
  notifyConnectionListeners(event) {
    this.connectionListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  /**
   * Get all connected peer IDs
   * @returns {string[]} Array of peer IDs
   */
  getConnectedPeers() {
    return Array.from(this.connections.keys());
  }

  /**
   * Get the current connection status
   * @returns {string} Current connection status
   */
  getConnectionStatus() {
    return this.connectionStatus;
  }

  /**
   * Destroy peer
   */ 
  destroyPeer() {
    if (this.peer && !this.isDestroying) {
      this.isDestroying = true;
      
      // Clear any pending reconnection
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      
      // Close all connections first
      this.connections.forEach(connection => {
        if (connection.open) {
          connection.close();
        }
      });
      this.connections.clear();

      // Destroy the peer
      try {
        if (!this.peer._destroyed) {
          this.peer.destroy();
        }
      } catch (error) {
        console.error('Error destroying peer:', error);
      }
      
      this.peer = null;
      this.peerId = null;
      this.isDestroying = false;
    }
  }

  /**
   * Clean up all connections and listeners
   */
  cleanup() {
    this.isDestroying = true;
    
    // Clear any pending reconnection
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Close all connections
    this.connections.forEach(connection => {
      if (connection.open) {
        connection.close();
      }
    });

    // Clear collections
    this.connections.clear();
    this.connectionListeners.clear();
    this.messageListeners.clear();

    // Destroy peer connection
    if (this.peer) {
      this.destroyPeer();
    }
    
    this.connectionStatus = CONNECTION_STATUS.DISCONNECTED;
    this.isDestroying = false;
  }
}

export default PeerConnection;
