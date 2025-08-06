/**
 * Switch Component
 * Toggle switch with improved styling and functionality
 */

import React, { useState } from 'react';

interface SwitchProps {
  id: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function Switch({ 
  id, 
  defaultChecked = false, 
  checked, 
  onChange, 
  disabled = false,
  label,
  className = ""
}: SwitchProps) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : internalChecked;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newChecked = e.target.checked;
    
    if (!isControlled) {
      setInternalChecked(newChecked);
    }
    
    onChange?.(newChecked);
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="relative inline-block w-10 h-6">
        <input
          type="checkbox"
          id={id}
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
        />
        <label
          htmlFor={id}
          className={`flex items-center w-full h-full rounded-full cursor-pointer transition-all duration-200 ${
            isChecked 
              ? 'bg-gradient-to-r from-blue-600 to-blue-800' 
              : 'bg-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`block w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ${
              isChecked ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </label>
      </div>
      {label && (
        <label htmlFor={id} className={`text-sm font-medium text-gray-700 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
          {label}
        </label>
      )}
    </div>
  );
}