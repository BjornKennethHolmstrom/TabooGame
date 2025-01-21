// components/TeamSelection/PlayerJoinForm.jsx
import React, { useState, useEffect } from 'react';

const PlayerJoinForm = ({ onJoinTeam, currentPlayerName = '' }) => {
  const [selectedTeam, setSelectedTeam] = useState('team1');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitting team join:', { selectedTeam, currentPlayerName });
    if (currentPlayerName.trim()) {
      onJoinTeam(selectedTeam);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-4">
      <div className="flex-1">
        <span className="text-sm font-medium">Playing as: {currentPlayerName}</span>
      </div>
      <select
        data-testid="team-select"
        value={selectedTeam}
        onChange={(e) => setSelectedTeam(e.target.value)}
        className="p-2 border rounded"
      >
        <option value="team1">Team 1</option>
        <option value="team2">Team 2</option>
      </select>
      <button
        type="submit"
        data-testid="join-team-button"
        disabled={!currentPlayerName}
        className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 
                 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Join
      </button>
    </form>
  );
};

export default PlayerJoinForm;
