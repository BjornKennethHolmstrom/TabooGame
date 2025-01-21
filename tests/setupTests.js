// tests/setupTests.js
global.RTCPeerConnection = jest.fn();
global.RTCSessionDescription = jest.fn();
global.RTCIceCandidate = jest.fn();

jest.setTimeout(10000); // Increase timeout to 10s
