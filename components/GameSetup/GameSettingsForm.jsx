// components/GameSetup/GameSettingsForm.jsx
import React from 'react';
import CardService from '../../services/CardService';
import { Card } from '@/components/ui/card';

const GameSettingsForm = ({ gameSettings, setGameSettings }) => {
  const categories = CardService.getCategories();
  const difficulties = CardService.getDifficulties();

  const handleNumberInput = (e, field) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setGameSettings({
        ...gameSettings,
        [field]: value
      });
    }
  };

  const handleCategoryToggle = (categoryId) => {
    const currentCategories = gameSettings.categories || [];
    const updatedCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId];

    setGameSettings({
      ...gameSettings,
      categories: updatedCategories
    });
  };

  const selectAllCategories = () => {
    setGameSettings({
      ...gameSettings,
      categories: categories.map(cat => cat.id)
    });
  };

  const deselectAllCategories = () => {
    setGameSettings({
      ...gameSettings,
      categories: []
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="turnDuration" className="block text-sm font-medium mb-1">
          Turn Duration (seconds)
        </label>
        <input
          id="turnDuration"
          type="number"
          value={gameSettings.turnDuration}
          onChange={(e) => handleNumberInput(e, 'turnDuration')}
          className="w-full p-2 border rounded"
          min="30"
          max="180"
        />
      </div>
      
      <div>
        <label htmlFor="rounds" className="block text-sm font-medium mb-1">
          Number of Rounds
        </label>
        <input
          id="rounds"
          type="number"
          value={gameSettings.rounds}
          onChange={(e) => handleNumberInput(e, 'rounds')}
          className="w-full p-2 border rounded"
          min="1"
          max="10"
        />
      </div>

      <div>
        <label htmlFor="difficulty" className="block text-sm font-medium mb-1">
          Difficulty
        </label>
        <select
          id="difficulty"
          value={gameSettings.difficulty}
          onChange={(e) => setGameSettings({
            ...gameSettings,
            difficulty: e.target.value
          })}
          className="w-full p-2 border rounded"
        >
          <option value="any">Any Difficulty</option>
          {difficulties.map((difficulty) => (
            <option key={difficulty.id} value={difficulty.id}>
              {difficulty.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium">Categories</label>
          <div className="space-x-2">
            <button
              type="button"
              onClick={selectAllCategories}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Select All
            </button>
            <span className="text-gray-400">|</span>
            <button
              type="button"
              onClick={deselectAllCategories}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Deselect All
            </button>
          </div>
        </div>
        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((category) => (
              <label
                key={category.id}
                className="flex items-center space-x-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={gameSettings.categories?.includes(category.id)}
                  onChange={() => handleCategoryToggle(category.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{category.name}</span>
              </label>
            ))}
          </div>
        </Card>
        {(!gameSettings.categories || gameSettings.categories.length === 0) && (
          <p className="text-sm text-red-500 mt-1">
            Please select at least one category
          </p>
        )}
      </div>
    </div>
  );
};

export default GameSettingsForm;
