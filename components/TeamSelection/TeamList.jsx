// components/TeamSelection/TeamList.jsx
const TeamList = ({ teamName, players }) => (
  <div className="border rounded p-4" data-testid={`team${teamName.split(' ')[1]}-list`}>
    <h3 className="font-bold mb-2">{teamName}</h3>
    <ul className="space-y-1">
      {players.map((player, idx) => (
        <li key={idx}>{player}</li>
      ))}
    </ul>
  </div>
);

export default TeamList;
