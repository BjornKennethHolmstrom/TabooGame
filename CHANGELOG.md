# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup with React, PeerJS, TailwindCSS, and Vite
- Basic game room creation and joining functionality
- Team selection implementation
- P2P connection management with PeerJS
- Game state synchronization between peers
- Room code generation and sharing
- Team joining and switching functionality
- Basic game start functionality (host-only)
- Test suite setup for components and integration tests
- State recovery and host failover mechanisms

### Known Issues
- Players not properly transitioning to game room when host starts game
- Edge cases in team member counting during game start

### Technical Debt
- Need to improve state synchronization during game phase transitions
- Better error handling for P2P connection edge cases
- More comprehensive testing for network failures