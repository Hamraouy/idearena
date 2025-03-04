import React, { useState } from 'react';
import { X, GitBranch } from 'lucide-react';
import { Argument } from '../types';
import { useGameStore } from '../store';

interface BranchArgumentModalProps {
  argumentId: string;
  onClose: () => void;
}

const BranchArgumentModal: React.FC<BranchArgumentModalProps> = ({
  argumentId,
  onClose
}) => {
  const { debate, branchArgument } = useGameStore();
  
  if (!debate) return null;
  
  const currentClaim = debate.claims[debate.currentClaimId];
  const argument = currentClaim.arguments.find(arg => arg.id === argumentId);
  
  const [newClaim, setNewClaim] = useState(argument?.content || '');
  
  if (!argument) return null;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClaim.trim()) {
      branchArgument(argumentId, newClaim);
      onClose();
    }
  };
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title flex items-center">
            <GitBranch size={20} className="mr-2" />
            Branch Argument into New Claim
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4">
          <p className="mb-4">
            You're creating a new sub-debate based on this argument:
          </p>
          
          <div className="p-3 bg-gray-100 rounded-lg mb-4">
            <p className="font-medium">{argument.content}</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">New Claim (you can edit it)</label>
              <textarea
                className="form-input"
                rows={3}
                value={newClaim}
                onChange={(e) => setNewClaim(e.target.value)}
                placeholder="Enter the new claim for debate..."
              />
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!newClaim.trim()}
              >
                Create Branch
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BranchArgumentModal;