# Taboo Online Game

A real-time multiplayer implementation of the popular word-guessing party game Taboo, built using React and WebRTC.

## Features

- Create and join game rooms
- Real-time multiplayer using peer-to-peer connections
- Team-based gameplay
- Automatic host failover
- State recovery after disconnections
- Mobile-friendly interface

## Technical Stack

- React
- PeerJS (WebRTC)
- TailwindCSS
- Vite

## Project Structure

```
/
├── src/                       # Main source files
├── components/                # React components
│   ├── GameRoom/              # Game room related components
│   ├── GameSetup/             # Setup screen components
│   └── TeamSelection/         # Team selection components
├── services/                  # Core services
│   └── peer/                  # Peer-to-peer networking
│       ├── PeerConnection.js  # WebRTC connection handling
│       ├── StateManager.js    # Game state management
│       ├── GameManager.js     # Game logic
│       └── HostManager.js     # Host election and management
└── tests/                     # Test files
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## How to Play

1. **Create a Room**
   - Click "Create Room"
   - Configure game settings
   - Share the room code with friends

2. **Join a Room**
   - Enter the room code
   - Choose your nickname
   - Select a team

3. **Gameplay**
   - One player describes a word
   - Their team tries to guess it
   - Can't use the taboo (forbidden) words
   - Other team can buzz if a taboo word is used

## Development

### Key Features Implementation

- **Peer-to-Peer Communication**: Using PeerJS for direct communication between players
- **State Management**: Distributed state management with automatic synchronization
- **Host Election**: Automatic host failover if the host disconnects
- **Recovery Mechanisms**: Automatic state recovery after temporary disconnections

### Testing

Run the tests:
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details

