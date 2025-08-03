"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TimePicker({ 
  value = '', 
  onChange, 
  placeholder = '09:00', 
  disabled = false,
  className = ''
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState(value ? parseInt(value.split(':')[0]) : 9);
  const [minutes, setMinutes] = useState(value ? parseInt(value.split(':')[1]) : 0);
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

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      setHours(h);
      setMinutes(m);
    }
  }, [value]);

  const formatTime = (h: number, m: number) => 
    `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

  const handleTimeChange = (newHours: number, newMinutes: number) => {
    setHours(newHours);
    setMinutes(newMinutes);
    onChange(formatTime(newHours, newMinutes));
  };

  const adjustHours = (increment: number) => {
    const newHours = Math.max(0, Math.min(23, hours + increment));
    handleTimeChange(newHours, minutes);
  };

  const adjustMinutes = (increment: number) => {
    let newMinutes = minutes + increment;
    let newHours = hours;
    
    if (newMinutes >= 60) {
      newMinutes = 0;
      newHours = Math.min(23, hours + 1);
    } else if (newMinutes < 0) {
      newMinutes = 45;
      newHours = Math.max(0, hours - 1);
    }
    
    handleTimeChange(newHours, newMinutes);
  };

  const quickTimes = [
    { label: 'Closed', value: '' },
    { label: '6:00', value: '06:00' },
    { label: '7:00', value: '07:00' },
    { label: '8:00', value: '08:00' },
    { label: '9:00', value: '09:00' },
    { label: '10:00', value: '10:00' },
    { label: '11:00', value: '11:00' },
    { label: '12:00', value: '12:00' },
    { label: '13:00', value: '13:00' },
    { label: '14:00', value: '14:00' },
    { label: '15:00', value: '15:00' },
    { label: '16:00', value: '16:00' },
    { label: '17:00', value: '17:00' },
    { label: '18:00', value: '18:00' },
    { label: '19:00', value: '19:00' },
    { label: '20:00', value: '20:00' },
    { label: '21:00', value: '21:00' },
    { label: '22:00', value: '22:00' },
    { label: '23:00', value: '23:00' },
  ];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          relative w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-left
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-all duration-200 shadow-sm hover:shadow-md
          ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500 shadow-lg' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <span className={`text-sm font-medium ${value ? 'text-gray-900' : 'text-gray-500'}`}>
              {value || placeholder}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl">
          {/* Time Adjuster */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-center space-x-8">
              {/* Hours */}
              <div className="text-center">
                <label className="block text-xs font-medium text-gray-500 mb-2">Hours</label>
                <div className="flex flex-col items-center space-y-2">
                  <button
                    type="button"
                    onClick={() => adjustHours(1)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ChevronUp className="w-4 h-4 text-gray-600" />
                  </button>
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                    <span className="text-xl font-bold text-blue-900">
                      {hours.toString().padStart(2, '0')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => adjustHours(-1)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="text-2xl font-bold text-gray-400 mt-8">:</div>

              {/* Minutes */}
              <div className="text-center">
                <label className="block text-xs font-medium text-gray-500 mb-2">Minutes</label>
                <div className="flex flex-col items-center space-y-2">
                  <button
                    type="button"
                    onClick={() => adjustMinutes(15)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ChevronUp className="w-4 h-4 text-gray-600" />
                  </button>
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                    <span className="text-xl font-bold text-blue-900">
                      {minutes.toString().padStart(2, '0')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => adjustMinutes(-15)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Time Selection */}
          <div className="p-4">
            <div className="grid grid-cols-4 gap-2">
              {quickTimes.map((time) => (
                <button
                  key={time.value}
                  type="button"
                  onClick={() => {
                    if (time.value === '') {
                      onChange('');
                    } else {
                      const [h, m] = time.value.split(':').map(Number);
                      handleTimeChange(h, m);
                    }
                    setIsOpen(false);
                  }}
                  className={`
                    px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150
                    ${time.value === value 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : time.value === ''
                        ? 'bg-red-50 text-red-700 hover:bg-red-100'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  {time.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 rounded-b-xl border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                Selected: {value || 'Not set'}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}