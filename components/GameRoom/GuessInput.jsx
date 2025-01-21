// Components/GameRoom/GuessInput.jsx
import React, { useState } from 'react';
import { Card, CardContent } from "../ui/card";
import { Send } from 'lucide-react';

const GuessInput = ({ onSubmit, disabled = false }) => {
  const [guess, setGuess] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (guess.trim() && !disabled) {
      onSubmit(guess.trim());
      setGuess('');
    }
  };

  const handleChange = (e) => {
    setGuess(e.target.value);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            data-testid="guess-input"
            type="text"
            value={guess}
            onChange={handleChange}
            placeholder={disabled ? "Wait for your turn..." : "Type your guess..."}
            className="flex-1 p-2 border rounded"
            disabled={disabled}
          />
          <button
            type="submit"
            disabled={disabled || !guess.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 
                     disabled:bg-gray-400 disabled:cursor-not-allowed
                     flex items-center gap-2"
            data-testid="submit-button"
          >
            <Send className="w-4 h-4" />
            Submit
          </button>
        </form>
      </CardContent>
    </Card>
  );
};

export default GuessInput;
