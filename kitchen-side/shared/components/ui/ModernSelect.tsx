"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface SelectOption {
  label: string;
  value: string;
  icon?: string;
  color?: string;
}

interface ModernSelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ModernSelect({ options, value, onChange, placeholder = "Select option", className = "" }: ModernSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(option => option.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl px-4 py-3 text-left
          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
          hover:bg-white/90 hover:border-gray-300/50 hover:shadow-md
          transition-all duration-200 shadow-sm
          ${isOpen ? 'ring-2 ring-blue-500/50 border-blue-500/50 shadow-md' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {selectedOption?.icon && (
              <span className="text-lg">{selectedOption.icon}</span>
            )}
            <span className={`text-sm font-medium ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}>
              {selectedOption?.label || placeholder}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-[9999] mt-2 w-full bg-white border border-gray-200/50 rounded-xl shadow-2xl overflow-hidden">
          <div className="py-1">
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full px-4 py-2.5 text-left hover:bg-blue-50/80 transition-all duration-150
                  ${value === option.value ? 'bg-blue-50/80' : ''}
                  ${index === 0 ? 'border-b border-gray-100/50' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    {option.icon && (
                      <span className="text-base">{option.icon}</span>
                    )}
                    <span className={`text-sm font-medium ${option.color || 'text-gray-900'}`}>
                      {option.label}
                    </span>
                  </div>
                  {value === option.value && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}