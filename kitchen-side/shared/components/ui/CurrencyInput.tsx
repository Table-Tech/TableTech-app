/**
 * Currency Input Component
 * Euro-formatted input with proper UX
 */

"use client";

import { useState, useRef, useEffect } from 'react';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  min?: number;
  max?: number;
}

export function CurrencyInput({ 
  value, 
  onChange, 
  placeholder = "€0,00",
  disabled = false,
  required = false,
  className = "",
  min = 0,
  max
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format number to Euro currency display
  const formatEuro = (num: number): string => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Format for editing (US format with dot - easier for users to edit)
  const formatForEditing = (num: number): string => {
    return num.toFixed(2); // Always returns US format like "10.00"
  };

  // Parse input value to number (always return US format with dot)
  const parseValue = (str: string): number => {
    // Remove any non-digit characters except decimal point and comma
    const cleaned = str.replace(/[^0-9.,]/g, '');
    // Replace comma with dot for consistent parsing (database expects US format)
    const normalized = cleaned.replace(',', '.');
    const parsed = parseFloat(normalized);
    const result = isNaN(parsed) ? 0 : Math.max(min, max ? Math.min(parsed, max) : parsed);
    
    // Ensure we return a properly formatted number for database (US format: 10.00)
    return Math.round(result * 100) / 100;
  };

  // Update display value when value prop changes
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value > 0 ? formatEuro(value) : '');
    }
  }, [value, isFocused]);

  // Handle focus - switch to editing format
  const handleFocus = () => {
    setIsFocused(true);
    setDisplayValue(value > 0 ? formatForEditing(value) : '');
    // Select all text for easy replacement
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.select();
      }
    }, 0);
  };

  // Handle blur - switch back to currency format
  const handleBlur = () => {
    setIsFocused(false);
    const parsedValue = parseValue(displayValue);
    // parsedValue is guaranteed to be US format (10.00) for database compatibility
    onChange(parsedValue);
    setDisplayValue(parsedValue > 0 ? formatEuro(parsedValue) : '');
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    
    // Live update while typing (optional - can be removed for performance)
    const parsedValue = parseValue(inputValue);
    onChange(parsedValue);
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, decimal point, comma
    if ([8, 9, 27, 13, 46, 110, 190, 188].includes(e.keyCode) ||
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode >= 65 && e.keyCode <= 90 && e.ctrlKey) ||
        // Allow numbers
        (e.keyCode >= 48 && e.keyCode <= 57) ||
        // Allow numpad numbers  
        (e.keyCode >= 96 && e.keyCode <= 105)) {
      return;
    }
    // Prevent other keys
    e.preventDefault();
  };

  const inputClasses = `
    block w-full py-2 border rounded-md shadow-sm 
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:bg-gray-50 disabled:cursor-not-allowed
    border-gray-300 focus:border-blue-500 focus:ring-blue-500
    ${className} 
    ${!isFocused && value > 0 ? 'text-green-600 font-medium pl-8 pr-3' : 'px-3'}
  `;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={inputClasses}
        autoComplete="off"
      />
      {isFocused && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
          EUR
        </div>
      )}
      {!isFocused && value > 0 && (
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600 text-sm pointer-events-none font-medium">
          💶
        </div>
      )}
    </div>
  );
}