// services/peer/types.js
export const CONNECTION_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
};

export const MESSAGE_TYPES = {
  STATE_UPDATE: 'stateUpdate',
  HOST_CHANGE: 'hostChange',
  STATE_REQUEST: 'stateRequest',
  STATE_RESPONSE: 'stateResponse',
  PEER_INFO: 'peerInfo'
};
