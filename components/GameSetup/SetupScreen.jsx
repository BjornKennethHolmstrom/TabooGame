// components/GameSetup/SetupScreen.jsx
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Settings } from 'lucide-react';
import GameSettingsForm from './GameSettingsForm';
import CardService from '../../services/CardService';

// Initialize with all categories selected
const DEFAULT_SETTINGS = {
  turnDuration: 60,
  rounds: 3,
  difficulty: 'any',
  categories: CardService.getCategories().map(cat => cat.id)
};

const SetupScreen = ({ onCreateRoom, onJoinRoom, onNameChange, playerName }) => {
  const [gameSettings, setGameSettings] = useState(DEFAULT_SETTINGS);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      console.log('No player name provided');
      return;
    }
    console.log('Creating room with settings:', { gameSettings, playerName });
    onCreateRoom(gameSettings);
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !joinCode.trim()) {
      console.log('Missing required fields');
      return;
    }
    onJoinRoom(joinCode);
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8" data-testid="setup-screen">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-6 h-6" />
          {isJoining ? 'Join Game' : 'Game Setup'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <label htmlFor="player-name" className="block text-sm font-medium mb-1">
              Your Name
            </label>
            <input
              id="player-name"
              data-testid="player-name-input"
              type="text"
              value={playerName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Enter your name"
              className="w-full p-2 border rounded"
              aria-label="Player Name"
            />
          </div>

          {isJoining ? (
            <div data-testid="join-game-section">
              <label htmlFor="room-code" className="block text-sm font-medium mb-1">
                Room Code
              </label>
              <input
                id="room-code"
                data-testid="room-code-input"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter room code"
                className="w-full p-2 border rounded"
                aria-label="Room Code"
              />
              <button
                data-testid="join-room-button"
                onClick={handleJoinRoom}
                disabled={!joinCode.trim() || !playerName.trim()}
                className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded 
                         hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                Join Room
              </button>
            </div>
          ) : (
            <>
              <GameSettingsForm 
                gameSettings={gameSettings}
                setGameSettings={setGameSettings}
              />
              <button
                data-testid="create-room-button"
                onClick={handleCreateRoom}
                disabled={!playerName.trim() || !gameSettings.categories?.length}
                className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded 
                         hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                Create Room
              </button>
            </>
          )}

          <button
            data-testid="toggle-join-mode"
            onClick={() => setIsJoining(!isJoining)}
            className="w-full mt-2 text-blue-600 hover:text-blue-700"
          >
            {isJoining ? 'Create a new room instead?' : 'Join existing room?'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SetupScreen;
