import React from 'react';
import { X, AlertTriangle, Lightbulb, Check } from 'lucide-react';

interface ArgumentValidationModalProps {
  validationResult: {
    valid: boolean;
    message: string;
    suggestions: string[];
  };
  onClose: () => void;
  onAcceptSuggestion: (suggestion: string) => void;
  onSubmitAnyway: () => void;
}

const ArgumentValidationModal: React.FC<ArgumentValidationModalProps> = ({
  validationResult,
  onClose,
  onAcceptSuggestion,
  onSubmitAnyway
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title flex items-center">
            <AlertTriangle size={20} className="mr-2 text-amber-500" />
            Argument Validation
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
            <p className="text-amber-700">{validationResult.message}</p>
          </div>
          
          {validationResult.suggestions && validationResult.suggestions.length > 0 && (
            <div className="mb-4">
              <h3 className="text-md font-semibold mb-2 flex items-center">
                <Lightbulb size={18} className="mr-2" fill="#FFC107" />
                Suggested Improvements
              </h3>
              
              <div className="space-y-2">
                {validationResult.suggestions.map((suggestion, index) => (
                  <div 
                    key={index}
                    className="flex items-start p-2 bg-white rounded border border-amber-100 hover:bg-amber-50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-gray-800">{suggestion}</p>
                    </div>
                    <button
                      className="ml-2 p-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                      onClick={() => onAcceptSuggestion(suggestion)}
                      title="Use this suggestion"
                    >
                      <Check size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-warning"
              onClick={onSubmitAnyway}
            >
              Submit Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; export default ArgumentValidationModal;