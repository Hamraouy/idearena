import React from 'react';
import { useGameStore } from '../store';

interface ArgumentTableProps {
  onSelectArgument?: (argumentId: string | null) => void;
  selectedArgument?: string | null;
}

const ArgumentTable: React.FC<ArgumentTableProps> = ({ 
  onSelectArgument = () => {}, 
  selectedArgument = null 
}) => {
  const { debate } = useGameStore();
  
  if (!debate) return null;
  
  const currentClaim = debate.claims[debate.currentClaimId];
  
  // Group arguments by stance
  const withArguments = currentClaim.arguments.filter(arg => arg.stance === 'WITH');
  const againstArguments = currentClaim.arguments.filter(arg => arg.stance === 'AGAINST');
  
  // Find the player names
  const getPlayerName = (playerId: number) => {
    const player = debate.players.find(p => p.id === playerId);
    return player ? player.name : 'Unknown';
  };
  
  return (
    <div className="mt-6 mb-6">
      <div className="overflow-x-auto">
        <table className="argument-table">
          <thead>
            <tr>
              <th className="with-column">Supporting</th>
              <th className="against-column">Opposing</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.max(withArguments.length, againstArguments.length) }).map((_, index) => (
              <tr key={index}>
                <td 
                  className={`with-column ${withArguments[index] && selectedArgument === withArguments[index].id ? 'bg-green-200' : ''}`}
                  onClick={() => withArguments[index] && onSelectArgument(
                    selectedArgument === withArguments[index].id ? null : withArguments[index].id
                  )}
                  style={{ cursor: withArguments[index] ? 'pointer' : 'default' }}
                >
                  {withArguments[index] && (
                    <div>
                      <div className="font-semibold">{getPlayerName(withArguments[index].player)}:</div>
                      <div>{withArguments[index].content}</div>
                    </div>
                  )}
                </td>
                <td 
                  className={`against-column ${againstArguments[index] && selectedArgument === againstArguments[index].id ? 'bg-red-200' : ''}`}
                  onClick={() => againstArguments[index] && onSelectArgument(
                    selectedArgument === againstArguments[index].id ? null : againstArguments[index].id
                  )}
                  style={{ cursor: againstArguments[index] ? 'pointer' : 'default' }}
                >
                  {againstArguments[index] && (
                    <div>
                      <div className="font-semibold">{getPlayerName(againstArguments[index].player)}:</div>
                      <div>{againstArguments[index].content}</div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {debate.arguments?.length === 0 && (
        <div className="text-center text-gray-500 mt-4">
          No arguments yet. Be the first to contribute!
        </div>
      )}
      {selectedArgument && (
        <div className="text-center text-sm text-gray-600 mt-2">
          Argument selected. Click "Debate" to branch this argument into a new claim.
        </div>
      )}
    </div>
  );
};

export default ArgumentTable;