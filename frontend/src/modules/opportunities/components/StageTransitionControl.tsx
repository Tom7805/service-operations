import React from 'react';
import type { Opportunity } from '../types/opportunityTypes';

interface StageTransitionControlProps {
  opportunity: Opportunity;
  onOpportunityUpdated: (updated: Opportunity) => void;
  currentUserRoles?: string[];
}

export default function StageTransitionControl({
  opportunity: _opportunity,
  onOpportunityUpdated: _onOpportunityUpdated,
  currentUserRoles: _currentUserRoles,
}: StageTransitionControlProps): React.ReactElement | null {
  return null;
}
