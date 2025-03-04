import React from 'react';
import { Lightbulb, Check, Loader, RefreshCw } from 'lucide-react';
import { ArgumentSuggestion } from '../types';

interface ArgumentSuggestionsProps {
  suggestions: ArgumentSuggestion[];
  loading?: boolean;
  onAccept: (id: string) => void;
  difficulty: string;
  onRegenerate?: () => void;
}

const ArgumentSuggestions: React.FC<ArgumentSuggestionsProps> = ({ 
  suggestions, 
  loading = false,
  onAccept,
  difficulty,
  onRegenerate
}) => {
  // Get the appropriate title based on difficulty
  const getTitle = () => {
    switch (difficulty) {
      case 'Easy':
        return 'Suggested Arguments (Easy Mode)';
      case 'Medium':
        return 'Argument Ideas (Medium Mode)';
      case 'Hard':
        return 'Hint (Hard Mode)';
      default:
        return 'Suggested Arguments';
    }
  };
  
  if (loading) {
    return (
      <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-center">
          <Loader size={20} className="mr-2 animate-spin text-amber-600" />
          <h3 className="text-md font-semibold text-amber-800">Generating suggestions...</h3>
        </div>
      </div>
    );
  }
  
  if (suggestions.length === 0) {
    return null;
  }
  
  return (
    <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-md font-semibold flex items-center text-amber-800">
          <Lightbulb size={18} className="mr-2" fill="#FFC107" />
          {getTitle()}
        </h3>
        {onRegenerate && (
          <button
            className="p-1.5 bg-amber-200 text-amber-800 rounded hover:bg-amber-300 transition-colors flex items-center text-sm"
            onClick={onRegenerate}
            title="Generate new suggestions"
          >
            <RefreshCw size={14} className="mr-1" />
            Regenerate
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        {suggestions.map(suggestion => (
          <div 
            key={suggestion.id}
            className="flex items-start p-2 bg-white rounded border border-amber-100 hover:bg-amber-50 transition-colors"
          >
            <div className="flex-1">
              <p className="text-gray-800">{suggestion.content}</p>
            </div>
            <button
              className="ml-2 p-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
              onClick={() => onAccept(suggestion.id)}
              title="Accept this argument"
            >
              <Check size={18} />
            </button>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-gray-500 mt-3">
        {difficulty === 'Easy' 
          ? 'Click the checkmark to use a suggested argument directly.' 
          : difficulty === 'Medium'
          ? 'These are partial ideas. Feel free to modify them before submitting.'
          : 'In Hard mode, you get minimal assistance. Craft your own detailed arguments.'}
      </p>
    </div>
  );
};

export default ArgumentSuggestions;