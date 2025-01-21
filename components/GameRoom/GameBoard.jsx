// components/GameRoom/GameBoard.jsx
import React from 'react';
import { Card, CardContent } from "../ui/card";
import { Timer, X } from 'lucide-react';

const GameBoard = ({ currentWord, tabooWords, timeLeft, isDescriber }) => {
  if (!currentWord) {
    return (
      <Card className="min-h-[300px]">
        <CardContent className="h-full flex items-center justify-center p-4">
          <div className="text-gray-500">Waiting for game to start...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="game-board" className="min-h-[300px]">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div data-testid="timer" className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        <div className="text-center space-y-6">
          {isDescriber ? (
            <>
              <div className="text-2xl font-bold mb-6">{currentWord}</div>
              <div className="space-y-2">
                {tabooWords.map((word, index) => (
                  <div key={index} className="flex items-center justify-center gap-2 text-red-600">
                    <X className="w-4 h-4" /> {word}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-lg">
              Guess the word being described!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GameBoard;
