import React from 'react';
import { useGame } from '../contexts/GameContext';

const Match: React.FC = () => {
  const { currentMatch, addMatchEvent, completeMatch } = useGame();

  if (!currentMatch) {
    return <div>No active match</div>;
  }

  return (
    <div className="match-container">
      <h2>Match in Progress</h2>
      <div className="teams">
        <div className="team">
          <h3>{currentMatch.homeTeam.name}</h3>
          <p>Score: {currentMatch.homeScore}</p>
        </div>
        <div className="team">
          <h3>{currentMatch.awayTeam.name}</h3>
          <p>Score: {currentMatch.awayScore}</p>
        </div>
      </div>
      <div className="match-events">
        <h3>Match Events</h3>
        <ul>
          {currentMatch.events.map((event) => (
            <li key={event.id}>{event.description}</li>
          ))}
        </ul>
      </div>
      <div className="match-actions">
        <button onClick={() => addMatchEvent({
          type: 'goal',
          minute: 45,
          teamId: currentMatch.homeTeam.id,
          description: 'Goal scored!'
        })}>Add Goal</button>
        <button onClick={() => completeMatch(currentMatch.homeTeam.id)}>Complete Match</button>
      </div>
    </div>
  );
};

export default Match; 