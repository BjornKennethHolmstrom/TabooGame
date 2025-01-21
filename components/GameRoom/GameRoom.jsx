// components/GameRoom/GameRoom.jsx
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import GameBoard from './GameBoard';
import GuessInput from './GuessInput';
import TeamScore from './TeamScore';

const GameRoom = ({ gameState, isHost, onGuess }) => {
  const isPlayersTurn = () => {
    if (!gameState?.currentTurn) return false;
    return gameState.currentTurn.describer === gameState.currentPlayer;
  };

  const isPlayerInActiveTeam = () => {
    if (!gameState?.currentTurn) return false;
    const activeTeam = gameState.teams[gameState.currentTurn.team];
    return activeTeam.players.includes(gameState.currentPlayer);
  };

  const canSubmitGuess = () => {
    if (isPlayersTurn()) return false; // Describer can't guess their own word
    return isPlayerInActiveTeam(); // Only active team can guess
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <TeamScore 
          data-testid="team1-score"
          teamName={gameState.teams.team1.name}
          score={gameState.teams.team1.score}
          isActive={gameState.currentTurn?.team === 'team1'}
          players={gameState.teams.team1.players}
          currentDescriber={gameState.currentTurn?.describer}
        />
        
        <GameBoard 
          data-testid="game-board"
          currentWord={gameState.currentWord?.word}
          tabooWords={gameState.currentWord?.tabooWords || []}
          timeLeft={gameState.currentTurn?.timeLeft || 0}
          isDescriber={isPlayersTurn()}
        />
        
        <TeamScore 
          data-testid="team2-score"
          teamName={gameState.teams.team2.name}
          score={gameState.teams.team2.score}
          isActive={gameState.currentTurn?.team === 'team2'}
          players={gameState.teams.team2.players}
          currentDescriber={gameState.currentTurn?.describer}
        />
      </div>
      
      {canSubmitGuess() && (
        <GuessInput
          onSubmit={onGuess}
          disabled={!isPlayerInActiveTeam() || isPlayersTurn()}
        />
      )}

      {isHost && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <button
                data-testid="report-taboo-button"
                onClick={() => onReportTaboo()}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Report Taboo Word
              </button>
              <button
                data-testid="end-turn-button"
                onClick={() => onEndTurn()}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                End Turn
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GameRoom;
