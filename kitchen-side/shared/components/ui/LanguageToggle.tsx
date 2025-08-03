"use client";

import React from 'react';
import { useLanguage, Language } from '@/shared/contexts/LanguageContext';

interface LanguageToggleProps {
  variant?: 'bubble' | 'compact' | 'minimal';
  className?: string;
}

export function LanguageToggle({ variant = 'bubble', className = '' }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'nl' : 'en');
  };

  if (variant === 'minimal') {
    return (
      <button
        onClick={toggleLanguage}
        className={`text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors ${className}`}
        title={`Switch to ${language === 'en' ? 'Dutch' : 'English'}`}
      >
        {language === 'en' ? 'EN' : 'NL'}
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={toggleLanguage}
        className={`inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors ${className}`}
        title={`Switch to ${language === 'en' ? 'Dutch' : 'English'}`}
      >
        {language === 'en' ? 'EN' : 'NL'}
      </button>
    );
  }

  // Default bubble variant - the beautiful one!
  return (
    <div className={`relative ${className}`}>
      <div 
        className="flex items-center bg-gray-100 rounded-full p-1 cursor-pointer transition-all duration-300 hover:bg-gray-200"
        onClick={toggleLanguage}
        title={`Switch to ${language === 'en' ? 'Dutch' : 'English'}`}
      >
        {/* Background bubble */}
        <div 
          className={`absolute w-8 h-8 bg-white rounded-full shadow-md transition-transform duration-300 ease-out ${
            language === 'en' 
              ? 'transform translate-x-0' 
              : 'transform translate-x-8'
          }`}
        />
        
        {/* EN Option */}
        <div 
          className={`relative z-10 w-8 h-8 flex items-center justify-center text-sm font-semibold transition-colors duration-300 ${
            language === 'en' 
              ? 'text-blue-600' 
              : 'text-gray-500'
          }`}
        >
          EN
        </div>
        
        {/* NL Option */}
        <div 
          className={`relative z-10 w-8 h-8 flex items-center justify-center text-sm font-semibold transition-colors duration-300 ${
            language === 'nl' 
              ? 'text-blue-600' 
              : 'text-gray-500'
          }`}
        >
          NL
        </div>
      </div>
    </div>
  );
}

// Keyboard shortcut component (optional)
export function LanguageKeyboardShortcut() {
  const { language, setLanguage } = useLanguage();

  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + L to toggle language
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'L') {
        event.preventDefault();
        setLanguage(language === 'en' ? 'nl' : 'en');
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [language, setLanguage]);

  return null;
}