/**
 * EmptyState Component
 * Reusable empty state with icon and call-to-action
 */

import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  } | React.ReactElement;
  className?: string;
}

export function EmptyState({ 
  icon = "📋", 
  title, 
  description, 
  action, 
  className = "" 
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="text-gray-400 text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-600 mb-6">{description}</p>
      )}
      {action && (
        React.isValidElement(action) ? action : (
          <Button onClick={action.onClick} variant="primary">
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}