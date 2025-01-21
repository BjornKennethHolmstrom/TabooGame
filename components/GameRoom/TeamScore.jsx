// components/GameRoom/TeamScore.jsx
import React from 'react';
import { Card, CardContent } from "../ui/card";

const TeamScore = ({ teamName, score }) => {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-bold mb-2">{teamName}</h3>
        <p>Score: {score}</p>
      </CardContent>
    </Card>
  );
};

export default TeamScore;
