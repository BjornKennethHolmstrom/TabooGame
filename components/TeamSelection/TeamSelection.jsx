// components/TeamSelection/TeamSelection.jsx
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Users } from 'lucide-react';
import PlayerJoinForm from './PlayerJoinForm';
import TeamList from './TeamList';

const TeamSelection = ({ teams, onJoinTeam, onStartGame, isHost, roomCode = '', currentPlayerName }) => {
  const canStartGame = () => {
    const hasEnoughTeam1Players = teams.team1.players.length >= 2;
    const hasEnoughTeam2Players = teams.team2.players.length >= 2;
    console.log('Checking can start game:', {
      hasEnoughTeam1Players,
      hasEnoughTeam2Players,
      isHost,
      team1Players: teams.team1.players,
      team2Players: teams.team2.players
    });
    return hasEnoughTeam1Players && hasEnoughTeam2Players && isHost;
  };

  const getStartButtonText = () => {
    if (!isHost) {
      console.log('Non-host waiting for game start');
      return "Waiting for host to start...";
    }
    if (teams.team1.players.length < 2 || teams.team2.players.length < 2) {
      console.log('Not enough players in teams');
      return "Need at least 2 players in each team";
    }
    return "Start Game";
  };

  const handleStartGame = () => {
    console.log('Start game button clicked:', {
      isHost,
      teams,
      canStart: canStartGame()
    });
    
    if (!canStartGame()) {
      console.warn('Start game button clicked but conditions not met');
      return;
    }
    
    onStartGame();
  };

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    // Create a temporary div for the toast
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded shadow-lg transition-opacity duration-500';
    toast.textContent = 'Room code copied!';
    document.body.appendChild(toast);

    // Remove the toast after 2 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 500);
    }, 2000);
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6" />
            Team Selection
          </div>
          {roomCode && (
            <div data-testid="room-code" className="flex items-center gap-2">
              <span className="text-lg font-semibold bg-blue-50 px-3 py-1 rounded border border-blue-200">
                Room Code: {roomCode}
              </span>
              <button
                onClick={handleCopyRoomCode}
                className="text-blue-600 hover:text-blue-800"
              >
                Copy
              </button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <PlayerJoinForm onJoinTeam={onJoinTeam} currentPlayerName={currentPlayerName} />
          
          <div className="grid grid-cols-2 gap-4">
            <div data-testid="team1-list" className="border rounded p-4">
              <TeamList 
                teamName={teams.team1.name}
                players={teams.team1.players}
              />
            </div>
            <div data-testid="team2-list" className="border rounded p-4">
              <TeamList 
                teamName={teams.team2.name}
                players={teams.team2.players}
              />
            </div>
          </div>
          
          <button
            data-testid="start-game-button"
            onClick={handleStartGame}
            disabled={!canStartGame()}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 
                     disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {getStartButtonText()}
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamSelection;
