import React from 'react';
import type { Opportunity } from '../types/opportunityTypes';

interface OpportunityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (created: Opportunity) => void;
}

export default function OpportunityFormModal({
  isOpen: _isOpen,
  onClose: _onClose,
  onSuccess: _onSuccess,
}: OpportunityFormModalProps): React.ReactElement | null {
  return null;
}
