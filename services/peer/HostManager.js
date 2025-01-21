// services/peer/HostManager.js
import { MESSAGE_TYPES } from './types';

export const HOST_EVENTS = {
  HOST_CHANGED: 'hostChanged',
  ELECTION_STARTED: 'electionStarted',
  ELECTION_ENDED: 'electionEnded',
  HOST_DISCONNECTED: 'hostDisconnected',
};

const ELECTION_TIMEOUT = 2000;
const HOST_ELECTION_TIMEOUT = 1000; // Reduce to 1 second for tests
const HOST_HEARTBEAT_INTERVAL = 500;

export const HOST_STATUS = {
  NO_HOST: 'noHost',
  ELECTING: 'electing',
  ACTIVE: 'active'
};

class HostManager {
  constructor(peerConnection, stateManager) {
    this.peerConnection = peerConnection;
    this.stateManager = stateManager;
    this.isHost = false;
    this.currentHost = null;
    this.electionTimeout = null;
    this.hostEventListeners = new Set();
    this.electionInProgress = false;
    this.lastHeartbeat = 0;
    this.heartbeatInterval = null;
    
    // Set up message listeners
    this.peerConnection.addMessageListener(this.handleHostMessage.bind(this));
    this.startHeartbeatMonitoring();
  }

  /**
   * Initialize as host (for room creator)
   */
  initializeAsHost() {
    this.isHost = true;
    this.currentHost = this.peerConnection.peerId;
    this.broadcastHostInfo();
    this.startHeartbeat();
    this.notifyHostEvent(HOST_EVENTS.HOST_CHANGED, {
      hostId: this.currentHost,
      isLocalHost: true
    });
  }

  /**
   * Handle host-related messages
   * @private
   */
  handleHostMessage(data, senderId) {
    if (!data.type) return;

    switch (data.type) {
      case 'hostHeartbeat':
        this.handleHeartbeat(senderId);
        break;
      case 'hostElectionStart':
        this.handleElectionStart(data.payload, senderId);
        break;
      case 'hostElectionVote':
        this.handleElectionVote(data.payload, senderId);
        break;
      case 'hostAnnouncement':
        this.handleHostAnnouncement(data.payload, senderId);
        break;
    }
  }

  /**
   * Start heartbeat monitoring
   * @private
   */
  startHeartbeatMonitoring() {
    setInterval(() => {
      if (this.currentHost && this.currentHost !== this.peerConnection.peerId) {
        const now = Date.now();
        // If no heartbeat received in 5 seconds, assume host is down
        if (now - this.lastHeartbeat > 5000) {
          this.handleHostDisconnection();
        }
      }
    }, 2000);
  }

  /**
   * Start sending heartbeats (when we are host)
   * @private
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.isHost) {
        this.peerConnection.broadcast({
          type: 'hostHeartbeat',
          payload: {
            timestamp: Date.now()
          }
        });
      }
    }, 1000);
  }

  /**
   * Handle incoming heartbeat
   * @private
   */
  handleHeartbeat(senderId) {
    if (senderId === this.currentHost) {
      this.lastHeartbeat = Date.now();
    }
  }

  /**
   * Handle host disconnection
   * @private
   */
  handleHostDisconnection() {
    if (this.electionInProgress) return;

    this.notifyHostEvent(HOST_EVENTS.HOST_DISCONNECTED, {
      previousHost: this.currentHost
    });
    
    this.startElection();
  }

  /**
   * Start host election process
   * @private
   */

  startElection() {
    if (this.electionInProgress) return;
    
    this.electionInProgress = true;
    this.currentHost = null; // Reset host immediately
    this.notifyHostEvent(HOST_EVENTS.ELECTION_STARTED);

    // Set shorter timeout for tests
    this.electionTimeout = setTimeout(() => {
      this.concludeElection();
    }, HOST_ELECTION_TIMEOUT);
  }

  /**
   * Calculate this peer's priority for host election
   * @private
   */
  calculatePriority() {
    // Priority based on:
    // 1. Connection stability (uptime)
    // 2. Number of connected peers
    // 3. Whether this peer was previously host
    const uptime = Date.now() - this.peerConnection.joinTimestamp;
    const connectedPeers = this.peerConnection.getConnectedPeers().length;
    const wasHost = this.wasRecentlyHost() ? 1 : 0;

    return {
      uptime,
      connectedPeers,
      wasHost,
      random: Math.random() // tiebreaker
    };
  }

  /**
   * Check if this peer was recently host
   * @private
   */
  wasRecentlyHost() {
    try {
      const hostHistory = JSON.parse(localStorage.getItem('hostHistory') || '[]');
      const recentHost = hostHistory.find(h => 
        h.peerId === this.peerConnection.peerId && 
        Date.now() - h.timestamp < 3600000 // within last hour
      );
      return !!recentHost;
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle election start message
   * @private
   */
  handleElectionStart(payload, senderId) {
    if (!this.electionInProgress) {
      this.startElection();
    }

    this.recordVote(payload);
  }

  /**
   * Record a vote during election
   * @private
   */
  recordVote(vote) {
    if (!this.votes) {
      this.votes = new Map();
    }
    this.votes.set(vote.peerId, vote);
  }

  /**
   * Conclude the election process
   * @private
   */
  concludeElection() {
    if (!this.electionInProgress) return;
    
    this.electionInProgress = false;
    clearTimeout(this.electionTimeout);

    const winner = this.determineElectionWinner();
    if (winner) {
      this.setNewHost(winner);
    } else {
      // If no winner, restart election
      setTimeout(() => this.startElection(), 1000);
    }

    this.votes = null;
    this.notifyHostEvent(HOST_EVENTS.ELECTION_ENDED, { newHost: winner });
  }

  /**
   * Determine winner of election
   * @private
   */
  determineElectionWinner() {
    if (!this.votes || this.votes.size === 0) return null;

    // Convert votes to array for sorting
    const candidates = Array.from(this.votes.values());
    
    // Sort by priority criteria
    candidates.sort((a, b) => {
      if (a.priority.wasHost !== b.priority.wasHost) {
        return b.priority.wasHost - a.priority.wasHost;
      }
      if (a.priority.connectedPeers !== b.priority.connectedPeers) {
        return b.priority.connectedPeers - a.priority.connectedPeers;
      }
      if (a.priority.uptime !== b.priority.uptime) {
        return b.priority.uptime - a.priority.uptime;
      }
      return b.priority.random - a.priority.random;
    });

    return candidates[0].peerId;
  }

  /**
   * Set new host after election
   * @private
   */
  setNewHost(hostId) {
    this.currentHost = hostId;
    this.isHost = hostId === this.peerConnection.peerId;

    if (this.isHost) {
      this.recordHostHistory();
      this.startHeartbeat();
      this.broadcastHostInfo();
    }

    // Update game state with new host
    this.stateManager.updateState({
      host: hostId,
      timestamp: Date.now()
    }, true);

    this.notifyHostEvent(HOST_EVENTS.HOST_CHANGED, {
      hostId: this.currentHost,
      isLocalHost: this.isHost
    });
  }

  /**
   * Record host history in local storage
   * @private
   */
  recordHostHistory() {
    try {
      const history = JSON.parse(localStorage.getItem('hostHistory') || '[]');
      history.push({
        peerId: this.peerConnection.peerId,
        timestamp: Date.now()
      });
      // Keep only last 10 entries
      while (history.length > 10) {
        history.shift();
      }
      localStorage.setItem('hostHistory', JSON.stringify(history));
    } catch (error) {
      console.error('Failed to record host history:', error);
    }
  }

  /**
   * Broadcast host information to all peers
   * @private
   */
  broadcastHostInfo() {
    if (!this.isHost) return;

    this.peerConnection.broadcast({
      type: 'hostAnnouncement',
      payload: {
        hostId: this.peerConnection.peerId,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Handle host announcement
   * @private
   */
  handleHostAnnouncement(payload, senderId) {
    if (this.electionInProgress) return;

    const { hostId, timestamp } = payload;
    if (timestamp > this.lastHeartbeat) {
      this.currentHost = hostId;
      this.isHost = hostId === this.peerConnection.peerId;
      this.lastHeartbeat = timestamp;

      this.notifyHostEvent(HOST_EVENTS.HOST_CHANGED, {
        hostId: this.currentHost,
        isLocalHost: this.isHost
      });
    }
  }

  /**
   * Add host event listener
   * @param {Function} listener - The listener function
   */
  addHostEventListener(listener) {
    this.hostEventListeners.add(listener);
  }

  /**
   * Remove host event listener
   * @param {Function} listener - The listener function to remove
   */
  removeHostEventListener(listener) {
    this.hostEventListeners.delete(listener);
  }

  /**
   * Notify all host event listeners
   * @private
   */
  notifyHostEvent(event, data = {}) {
    this.hostEventListeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in host event listener:', error);
      }
    });
  }

  /**
   * Get current host status
   * @returns {Object} Host status information
   */
  getHostStatus() {
    return {
      currentHost: this.currentHost,
      isHost: this.isHost,
      electionInProgress: this.electionInProgress
    };
  }

  /**
   * Clean up host manager
   */
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.electionTimeout) {
      clearTimeout(this.electionTimeout);
    }
    this.hostEventListeners.clear();
    this.votes = null;
    this.currentHost = null;
    this.isHost = false;
    this.electionInProgress = false;
  }
}

export default HostManager;
